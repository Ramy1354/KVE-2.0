import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { buildPrefixInteraction, resolveUser, restReason } from "../prefixUtils.js";

const OK = '<:KVE_Authorized:1516458403411529788>';
const NO = '<:KVE_Unauthorized:1516457478651510976>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user from the server with explicit permission mapping.")
    .addUserOption((option) =>
        option.setName("target")
            .setDescription("The user to ban")
            .setRequired(true)
    )
    .addStringOption((option) =>
        option.setName("reason")
            .setDescription("The reason for the ban")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction) {
    const targetUser = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason") || "No reason provided";

    // 1. SELF BAN GUARD
    if (targetUser.id === interaction.user.id) {
        return interaction.reply({ 
            content: `${ERR} **ERROR:** You cannot ban yourself from this server context.`, 
            ephemeral: true 
        });
    }

    // 2. BOT SELF BAN GUARD
    if (targetUser.id === interaction.client.user.id) {
        return interaction.reply({ 
            content: `${ERR} **ERROR:** Operational safety parameters prevent me from banning my own client token.`, 
            ephemeral: true 
        });
    }

    try {
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
        if (targetMember) {
            // 3. EXECUTIONER HIERARCHY CHECK
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
                return interaction.reply({
                    content: `${NO} **UNAUTHORIZED ACCESS:** You do not possess high enough clearance to ban ${targetUser.tag}. Their highest role matches or exceeds yours.`,
                    ephemeral: true
                });
            }

            // 4. BOT CLIENT HIERARCHY CHECK
            if (!targetMember.bannable) {
                return interaction.reply({ 
                    content: `${NO} **UNAUTHORIZED ACCESS:** I cannot ban ${targetUser.tag}. My highest server role is positioned lower than or equal to their account roles.`, 
                    ephemeral: true 
                });
            }

            // Execute local member guild exclusion
            await targetMember.ban({ reason });
        } else {
            // 5. RESTFUL TARGET BAN
            await interaction.guild.bans.create(targetUser.id, { reason });
        }

        // Plain text success output matching your standard markdown design
        await interaction.reply({ 
            content: `${OK} **Server Ban Executed Successfully**\n\n**Target User:** ${targetUser.tag} (\`${targetUser.id}\`)\n**Enforcer:** ${interaction.user}\n**Reason:** *${reason}*`,
            ephemeral: true 
        });

    } catch (error) {
        console.error("Ban Command Error Structure:", error);
        
        await interaction.reply({ 
            content: `${ERR} **Internal Access Exception:** Failed to execute ban operations on ${targetUser.tag}. Verify that my app role holds explicit \`Ban Members\` rights and sits on top of target roles inside the integration hierarchy list.`, 
            ephemeral: true 
        });
    }
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return message.reply(`${NO} Unauthorized Access.`);
    }

    const targetUser = await resolveUser(message, args[0]);
    if (!targetUser) {
        return message.reply(`${ERR} Usage: \`KV$ban @user [reason]\``);
    }

    return execute(buildPrefixInteraction(message, {
        values: {
            target: targetUser,
            reason: restReason(args, 1)
        }
    }));
}

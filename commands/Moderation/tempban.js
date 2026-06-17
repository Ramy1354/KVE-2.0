import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import ms from "ms";
import { buildPrefixInteraction, resolveUser, restReason } from "../prefixUtils.js";

const OK = '<:KVE_Authorized:1516458403411529788>';
const NO = '<:KVE_Unauthorized:1516457478651510976>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("tempban")
    .setDescription("Ban a user temporarily from the server.")
    .addUserOption(opt => opt.setName("target").setDescription("The user to tempban").setRequired(true))
    .addStringOption(opt => opt.setName("duration").setDescription("Time length (e.g., 30m, 12h, 7d)").setRequired(true))
    .addStringOption(opt => opt.setName("reason").setDescription("Reason for the temporary ban"))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction) {
    const targetUser = interaction.options.getUser("target");
    const durationStr = interaction.options.getString("duration");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (targetUser.id === interaction.user.id) return interaction.reply({ content: `${NO} You cannot ban yourself.`, ephemeral: true });
    if (targetUser.id === interaction.client.user.id) return interaction.reply({ content: `${NO} I cannot ban myself.`, ephemeral: true });

    const msDuration = ms(durationStr);
    if (!msDuration || msDuration < 60000) {
        return interaction.reply({ content: `${ERR} Invalid time duration format. Must be at least 1 minute (\`1m\`).`, ephemeral: true });
    }

    try {
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
        if (member) {
            if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
                return interaction.reply({ content: `${NO} **UNAUTHORIZED ACCESS:** Target user's role height exceeds your authority level.`, ephemeral: true });
            }
            if (!member.bannable) {
                return interaction.reply({ content: `${NO} **UNAUTHORIZED ACCESS:** I lack API permissions to ban this member.`, ephemeral: true });
            }
            await member.ban({ reason: `[Tempban: ${durationStr}] ${reason}` });
        } else {
            await interaction.guild.bans.create(targetUser.id, { reason: `[Tempban: ${durationStr}] ${reason}` });
        }

        await interaction.reply({ 
            content: `${OK} **Temporary Ban Executed**\n\n**User:** ${targetUser.tag} (\`${targetUser.id}\`)\n**Duration:** ${durationStr}\n**Reason:** *${reason}*` 
        });

        // Set an automated background scheduler to revoke the ban when time expires
        setTimeout(async () => {
            try {
                const currentBans = await interaction.guild.bans.fetch().catch(() => null);
                if (currentBans && currentBans.has(targetUser.id)) {
                    await interaction.guild.bans.remove(targetUser.id, "Temporary ban duration expired.");
                    console.log(`[Tempban Info] Automatically unbanned ${targetUser.tag} (${targetUser.id}). Duration complete.`);
                }
            } catch (unbanErr) {
                console.error(`Failed executing scheduled unban on user: ${targetUser.id}`, unbanErr);
            }
        }, msDuration);

    } catch (error) {
        console.error(error);
        await interaction.reply({ content: `${ERR} Failed to complete temporary ban command sequence.`, ephemeral: true });
    }
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return message.reply(`${NO} Unauthorized Access.`);
    }

    const targetUser = await resolveUser(message, args[0]);
    const duration = args[1];
    if (!targetUser || !duration) {
        return message.reply(`${ERR} Usage: \`KV$tempban @user <duration> [reason]\``);
    }

    return execute(buildPrefixInteraction(message, {
        values: {
            target: targetUser,
            duration,
            reason: restReason(args, 2)
        }
    }));
}

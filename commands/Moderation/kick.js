import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { buildPrefixInteraction, resolveUser, restReason } from "../prefixUtils.js";

const OK = '<:KVE_Authorized:1516458403411529788>';
const NO = '<:KVE_Unauthorized:1516457478651510976>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a user from the server.")
    .addUserOption(opt => opt.setName("target").setDescription("The user to kick").setRequired(true))
    .addStringOption(opt => opt.setName("reason").setDescription("The reason for the kick"))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

export async function execute(interaction) {
    const targetUser = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (targetUser.id === interaction.user.id) return interaction.reply({ content: `${NO} You cannot kick yourself.`, ephemeral: true });
    if (targetUser.id === interaction.client.user.id) return interaction.reply({ content: `${NO} I cannot kick myself.`, ephemeral: true });

    try {
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) return interaction.reply({ content: `${ERR} That user doesn't seem to be in this server.`, ephemeral: true });

        if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
            return interaction.reply({ content: `${NO} **UNAUTHORIZED ACCESS:** You cannot kick someone with an equal or higher role than yours.`, ephemeral: true });
        }

        if (!member.kickable) {
            return interaction.reply({ content: `${NO} **UNAUTHORIZED ACCESS:** I cannot kick this user. Their role is above mine.`, ephemeral: true });
        }

        await member.kick(reason);

        await interaction.reply({ 
            content: `${OK} **User Kicked Successfully**\n\n**User:** ${targetUser.tag} (\`${targetUser.id}\`)\n**Moderator:** ${interaction.user}\n**Reason:** *${reason}*` 
        });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: `${ERR} Failed to complete kick action.`, ephemeral: true });
    }
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        return message.reply(`${NO} Unauthorized Access.`);
    }

    const targetUser = await resolveUser(message, args[0]);
    if (!targetUser) {
        return message.reply(`${ERR} Usage: \`KV$kick @user [reason]\``);
    }

    return execute(buildPrefixInteraction(message, {
        values: {
            target: targetUser,
            reason: restReason(args, 1)
        }
    }));
}

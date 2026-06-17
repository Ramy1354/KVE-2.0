import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { buildPrefixInteraction, extractId, restReason } from "../prefixUtils.js";

const OK = '<:KVE_Authorized:1516458403411529788>';
const NO = '<:KVE_Unauthorized:1516457478651510976>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user from the server with explicit permission mapping.")
    .addStringOption((option) =>
        option.setName("target-id")
            .setDescription("The ID of the user to unban")
            .setRequired(true)
    )
    .addStringOption((option) =>
        option.setName("reason")
            .setDescription("The reason for the unban")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction) {
    const targetId = extractId(interaction.options.getString("target-id"));
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (!targetId) {
        return interaction.reply({
            content: `${ERR} Provide a valid Discord user ID to unban.`,
            ephemeral: true
        });
    }

    if (targetId === interaction.user.id) {
        return interaction.reply({
            content: `${NO} You are not banned from this server context.`,
            ephemeral: true
        });
    }

    try {
        const banRecord = await interaction.guild.bans.fetch(targetId).catch(() => null);
        if (!banRecord) {
            return interaction.reply({
                content: `${ERR} No active ban record found for user ID \`${targetId}\`.`,
                ephemeral: true
            });
        }

        await interaction.guild.bans.remove(targetId, reason);

        return interaction.reply({
            content: `${OK} **Server Unban Executed Successfully**\n\n**Target User:** ${banRecord.user.tag} (\`${targetId}\`)\n**Enforcer:** ${interaction.user}\n**Reason:** *${reason}*`,
            ephemeral: true
        });
    } catch (error) {
        console.error("Unban Command Error Structure:", error);
        return interaction.reply({
            content: `${ERR} **Internal Access Exception:** Failed to remove ban record for \`${targetId}\`. Verify that I have \`Ban Members\` permission.`,
            ephemeral: true
        });
    }
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return message.reply(`${NO} Unauthorized Access.`);
    }

    const targetId = extractId(args[0]);
    if (!targetId) {
        return message.reply(`${ERR} Usage: \`KV$unban <user-id> [reason]\``);
    }

    return execute(buildPrefixInteraction(message, {
        values: {
            "target-id": targetId,
            reason: restReason(args, 1)
        }
    }));
}

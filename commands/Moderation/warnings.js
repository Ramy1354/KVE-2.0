import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import db from "../../database.js";
import { buildPrefixInteraction, resolveUser } from "../prefixUtils.js";

const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Look up the warning history log for a specific user.")
    .addUserOption(opt => opt.setName("target").setDescription("The user to check").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction) {
    const targetUser = interaction.options.getUser("target");

    try {
        const history = db.prepare("SELECT * FROM user_warnings WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC")
                          .all(interaction.guild.id, targetUser.id);

        if (history.length === 0) {
            return interaction.reply({ content: `✅ **${targetUser.tag}** clean profile record — 0 active warnings found.` });
        }

        let responseText = `📜 **Warning Dossier for ${targetUser.tag}** (\`${targetUser.id}\`)\n`;
        responseText += `Total Tracked Violations: **${history.length}**\n`;
        responseText += `========================================\n\n`;

        history.slice(0, 10).forEach((warn) => {
            const dateStr = new Date(warn.timestamp).toLocaleDateString();
            responseText += `🆔 **Case ID:** \`#${warn.id}\` | 📅 **Date:** ${dateStr}\n`;
            responseText += `🛡️ **Moderator:** <@${warn.moderator_id}>\n`;
            responseText += `📝 **Reason:** *${warn.reason}*\n`;
            responseText += `----------------------------------------\n`;
        });

        if (history.length > 10) {
            responseText += `*...and ${history.length - 10} more warning entries matching this index data.*`;
        }

        await interaction.reply({ content: responseText });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: `${ERR} Exception pulling active warning records.`, ephemeral: true });
    }
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return message.reply(`${ERR} Unauthorized Access.`);
    }

    const targetUser = await resolveUser(message, args[0]);
    if (!targetUser) {
        return message.reply(`${ERR} Usage: \`KV$warnings @user\``);
    }

    return execute(buildPrefixInteraction(message, {
        values: { target: targetUser }
    }));
}

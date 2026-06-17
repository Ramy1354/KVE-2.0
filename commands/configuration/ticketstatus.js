import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import db from "../../database.js";
import { buildPrefixInteraction } from "../prefixUtils.js";

const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("ticket-status")
    .setDescription("Inspect live metrics of the ticket framework.");

export async function execute(interaction) {
    const { guild, member } = interaction;

    const settings = db.prepare("SELECT * FROM ticket_settings WHERE guild_id = ?").get(guild.id);
    if (!settings) return interaction.reply({ content: `${ERR} Ticket engine unconfigured on this node.`, ephemeral: true });

    const isStaff = member.roles.cache.has(settings.staff_role_id) || member.permissions.has(PermissionFlagsBits.Administrator);
    if (!isStaff) return interaction.reply({ content: `${ERR} Access restricted to support staff.`, ephemeral: true });

    const openTickets = db.prepare("SELECT COUNT(*) as count FROM active_tickets WHERE guild_id = ? AND status = 'OPEN'").get(guild.id);
    const totalBlacklisted = db.prepare("SELECT COUNT(*) as count FROM ticket_blacklist").get();

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("📊 Ticket Tool Diagnostics")
        .addFields(
            { name: "🎛️ Mapping Configuration", value: `**Category:** <#${settings.category_id}>\n**Staff Role:** <@&${settings.staff_role_id}>\n**Logs/Transcripts:** <#${settings.transcript_channel_id}>`, inline: false },
            { name: "📈 Live Server Metrics", value: `**Active Open Tickets:** \`${openTickets.count}\` channels\n**Total Lifetime Tickets:** \`${settings.ticket_count}\` processed\n**Blacklisted Users:** \`${totalBlacklisted.count}\` targets active`, inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

export async function prefixExecute(message) {
    return execute(buildPrefixInteraction(message));
}

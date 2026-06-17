import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import db from "../../database.js";
import { buildPrefixInteraction } from "../prefixUtils.js";

const ERR = '<:KVE_ERROR:1516460442149720184>';
const OK = '<:KVE_Approved:1516458503546339489>';

export const data = new SlashCommandBuilder()
    .setName("ticket-rename")
    .setDescription("Renames the active ticket channel naming structure layout.")
    .addStringOption(option => option.setName("new-name").setDescription("The new string name").setRequired(true));

export async function execute(interaction) {
    const { channel, guildId, options, member } = interaction;

    const ticketData = db.prepare("SELECT * FROM active_tickets WHERE channel_id = ?").get(channel.id);
    if (!ticketData) return interaction.reply({ content: `${ERR} Command restricted to active ticket environments.`, ephemeral: true });

    const settings = db.prepare("SELECT staff_role_id FROM ticket_settings WHERE guild_id = ?").get(guildId);
    const isStaff = member.roles.cache.has(settings?.staff_role_id) || member.permissions.has(PermissionFlagsBits.Administrator);
    if (!isStaff) return interaction.reply({ content: `${ERR} Administrative access required.`, ephemeral: true });

    const newNameInput = options.getString("new-name").toLowerCase().replace(/ +/g, "-");

    try {
        await channel.setName(`ticket-${newNameInput}`);
        await interaction.reply({ content: `${OK} Channel signature re-mapped to: **ticket-${newNameInput}**.` });
    } catch (err) {
        await interaction.reply({ content: `${ERR} API rate limit or validation blocks prevented rename execution.`, ephemeral: true });
    }
}

export async function prefixExecute(message, args) {
    const newName = args.join(" ").trim();
    if (!newName) {
        return message.reply(`${ERR} Usage: \`KV$ticket-rename <new name>\``);
    }

    return execute(buildPrefixInteraction(message, {
        values: { "new-name": newName }
    }));
}

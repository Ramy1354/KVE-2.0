import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import db from "../../database.js";
import { buildPrefixInteraction, resolveUser } from "../prefixUtils.js";

const ERR = '<:KVE_ERROR:1516460442149720184>';
const OK = '<:KVE_Approved:1516458503546339489>';

export const data = new SlashCommandBuilder()
    .setName("ticket-add")
    .setDescription("Adds a specific user to this active ticket channel.")
    .addUserOption(option => option.setName("user").setDescription("The user to inject into the ticket").setRequired(true));

export async function execute(interaction) {
    const { channel, guildId, options, member } = interaction;

    const ticketData = db.prepare("SELECT * FROM active_tickets WHERE channel_id = ?").get(channel.id);
    if (!ticketData) {
        return interaction.reply({ content: `${ERR} Command restricted to active ticket environments.`, ephemeral: true });
    }

    const settings = db.prepare("SELECT staff_role_id FROM ticket_settings WHERE guild_id = ?").get(guildId);
    const isStaff = member.roles.cache.has(settings?.staff_role_id) || member.permissions.has(PermissionFlagsBits.Administrator);
    if (!isStaff) return interaction.reply({ content: `${ERR} Support staff clearance required.`, ephemeral: true });

    const targetUser = options.getUser("user");

    try {
        await channel.permissionOverwrites.edit(targetUser.id, {
            ViewChannel: true, SendMessages: true, AttachFiles: true, EmbedLinks: true
        });
        await interaction.reply({ content: `${OK} <@${targetUser.id}> has been added to the ticket profile matrix.` });
    } catch (err) {
        await interaction.reply({ content: `${ERR} Failed to adjust channel permission overwrites.`, ephemeral: true });
    }
}

export async function prefixExecute(message, args) {
    const targetUser = await resolveUser(message, args[0]);
    if (!targetUser) {
        return message.reply(`${ERR} Usage: \`KV$ticket-add @user\``);
    }

    return execute(buildPrefixInteraction(message, {
        values: { user: targetUser }
    }));
}

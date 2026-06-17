import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import db from "../../database.js";
import { buildPrefixInteraction, resolveUser } from "../prefixUtils.js";

const ERR = '<:KVE_ERROR:1516460442149720184>';
const OK = '<:KVE_Approved:1516458503546339489>';

export const data = new SlashCommandBuilder()
    .setName("ticket-remove")
    .setDescription("Removes a specific user's visibility from this active ticket channel.")
    .addUserOption(option => option.setName("user").setDescription("The user to sever from the channel").setRequired(true));

export async function execute(interaction) {
    const { channel, guildId, options, member } = interaction;

    const ticketData = db.prepare("SELECT * FROM active_tickets WHERE channel_id = ?").get(channel.id);
    if (!ticketData) return interaction.reply({ content: `${ERR} Command restricted to active ticket environments.`, ephemeral: true });

    const settings = db.prepare("SELECT staff_role_id FROM ticket_settings WHERE guild_id = ?").get(guildId);
    const isStaff = member.roles.cache.has(settings?.staff_role_id) || member.permissions.has(PermissionFlagsBits.Administrator);
    if (!isStaff) return interaction.reply({ content: `${ERR} Unauthorized access path.`, ephemeral: true });

    const targetUser = options.getUser("user");
    if (targetUser.id === ticketData.user_id) {
        return interaction.reply({ content: `${ERR} Cannot remove the primary ticket creator. Use 'Lock User' controls instead.`, ephemeral: true });
    }

    try {
        await channel.permissionOverwrites.delete(targetUser.id);
        await interaction.reply({ content: `${OK} Access grid revoked. <@${targetUser.id}> isolated from channel.` });
    } catch (err) {
        await interaction.reply({ content: `${ERR} Failed to flush permission registers.`, ephemeral: true });
    }
}

export async function prefixExecute(message, args) {
    const targetUser = await resolveUser(message, args[0]);
    if (!targetUser) {
        return message.reply(`${ERR} Usage: \`KV$ticket-remove @user\``);
    }

    return execute(buildPrefixInteraction(message, {
        values: { user: targetUser }
    }));
}

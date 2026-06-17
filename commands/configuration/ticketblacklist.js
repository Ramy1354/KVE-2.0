import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import db from "../../database.js";
import { buildPrefixInteraction, resolveUser, restReason } from "../prefixUtils.js";

const ERR = '<:KVE_ERROR:1516460442149720184>';
const OK = '<:KVE_Approved:1516458503546339489>';

export const data = new SlashCommandBuilder()
    .setName("ticket-blacklist")
    .setDescription("Manage the ticket firewall blacklist matrix.")
    .addSubcommand(sub => sub.setName("add").setDescription("Ban a user from opening tickets.").addUserOption(o => o.setName("target").setDescription("User to block").setRequired(true)).addStringOption(o => o.setName("reason").setDescription("Why are they being blocked?")))
    .addSubcommand(sub => sub.setName("remove").setDescription("Unban a user from opening tickets.").addUserOption(o => o.setName("target").setDescription("User to unblock").setRequired(true)));

export async function execute(interaction) {
    const { guildId, options, member } = interaction;

    const settings = db.prepare("SELECT staff_role_id FROM ticket_settings WHERE guild_id = ?").get(guildId);
    const isStaff = member.roles.cache.has(settings?.staff_role_id) || member.permissions.has(PermissionFlagsBits.Administrator);
    if (!isStaff) return interaction.reply({ content: `${ERR} Clearance error. Staff only.`, ephemeral: true });

    const subcommand = options.getSubcommand();
    const target = options.getUser("target");

    if (subcommand === "add") {
        const reason = options.getString("reason") || "No reason specified.";
        db.prepare("INSERT INTO ticket_blacklist (user_id, blacklisted_by, reason) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET reason = excluded.reason").run(target.id, interaction.user.id, reason);
        return interaction.reply({ content: `${OK} **<@${target.id}> has been blacklisted from the ticket matrix.**\nReason: *${reason}*` });
    }

    if (subcommand === "remove") {
        const check = db.prepare("SELECT * FROM ticket_blacklist WHERE user_id = ?").get(target.id);
        if (!check) return interaction.reply({ content: `${ERR} Target isn't currently blacklisted.`, ephemeral: true });

        db.prepare("DELETE FROM ticket_blacklist WHERE user_id = ?").run(target.id);
        return interaction.reply({ content: `${OK} **Access restored.** <@${target.id}> can now open tickets.` });
    }
}

export async function prefixExecute(message, args) {
    const subcommand = args[0]?.toLowerCase();
    const target = await resolveUser(message, args[1]);

    if (!["add", "remove"].includes(subcommand) || !target) {
        return message.reply(`${ERR} Usage: \`KV$ticket-blacklist <add|remove> @user [reason]\``);
    }

    return execute(buildPrefixInteraction(message, {
        subcommand,
        values: {
            target,
            reason: restReason(args, 2, "No reason specified.")
        }
    }));
}

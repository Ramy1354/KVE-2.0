import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import db from "../../database.js";
import { buildPrefixInteraction, resolveUser } from "../prefixUtils.js";

const OK = '<:KVE_Authorized:1516458403411529788>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("clearwarnings")
    .setDescription("Wipe all logged warning infractions for a user.")
    .addUserOption(opt => opt.setName("target").setDescription("The user whose data records to purge").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const targetUser = interaction.options.getUser("target");

    try {
        const check = db.prepare("SELECT COUNT(*) as count FROM user_warnings WHERE guild_id = ? AND user_id = ?")
                        .get(interaction.guild.id, targetUser.id);

        if (check.count === 0) {
            return interaction.reply({ content: `${ERR} No logged warnings found on profile index matching user: **${targetUser.tag}**.`, ephemeral: true });
        }

        db.prepare("DELETE FROM user_warnings WHERE guild_id = ? AND user_id = ?")
          .run(interaction.guild.id, targetUser.id);

        await interaction.reply({ content: `${OK} Cleared history index files. Erased **${check.count}** warnings from **${targetUser.tag}**'s record map.` });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: `${ERR} Failed to complete database deletion operations.`, ephemeral: true });
    }
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply(`${ERR} Unauthorized Access.`);
    }

    const targetUser = await resolveUser(message, args[0]);
    if (!targetUser) {
        return message.reply(`${ERR} Usage: \`KV$clearwarnings @user\``);
    }

    return execute(buildPrefixInteraction(message, {
        values: { target: targetUser }
    }));
}

import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import db from "../../database.js";
import { buildPrefixInteraction, resolveUser, restReason } from "../prefixUtils.js";

const OK = '<:KVE_Authorized:1516458403411529788>';
const NO = '<:KVE_Unauthorized:1516457478651510976>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Log an official server warning against a user.")
    .addUserOption(opt => opt.setName("target").setDescription("The user to warn").setRequired(true))
    .addStringOption(opt => opt.setName("reason").setDescription("Reason for the warning").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction) {
    const targetUser = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason");

    if (targetUser.bot) return interaction.reply({ content: `${NO} Automated bot accounts cannot be warned.`, ephemeral: true });
    if (targetUser.id === interaction.user.id) return interaction.reply({ content: `${NO} You cannot issue a warning to yourself.`, ephemeral: true });

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (member && member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
        return interaction.reply({ content: `${NO} You don't have enough authority to warn this member.`, ephemeral: true });
    }

    try {
        db.prepare("INSERT INTO user_warnings (guild_id, user_id, moderator_id, reason, timestamp) VALUES (?, ?, ?, ?, ?)")
          .run(interaction.guild.id, targetUser.id, interaction.user.id, reason, Date.now());

        await targetUser.send({ content: `⚠️ You received a warning in **${interaction.guild.name}**\n**Reason:** ${reason}` }).catch(() => {});

        await interaction.reply({ 
            content: `${OK} **Warning Logged Successfully**\n\n**User:** ${targetUser} (\`${targetUser.id}\`)\n**Staff:** ${interaction.user}\n**Reason:** *${reason}*` 
        });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: `${ERR} Failed to record user warning.`, ephemeral: true });
    }
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return message.reply(`${NO} Unauthorized Access.`);
    }

    const targetUser = await resolveUser(message, args[0]);
    const reason = restReason(args, 1, "");
    if (!targetUser || !reason) {
        return message.reply(`${ERR} Usage: \`KV$warn @user <reason>\``);
    }

    return execute(buildPrefixInteraction(message, {
        values: { target: targetUser, reason }
    }));
}

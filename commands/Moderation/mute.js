import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import ms from "ms";
import { buildPrefixInteraction, resolveUser, restReason } from "../prefixUtils.js";

const OK = '<:KVE_Authorized:1516458403411529788>';
const NO = '<:KVE_Unauthorized:1516457478651510976>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Timeout/Mute a member in the server.")
    .addUserOption(opt => opt.setName("target").setDescription("The user to timeout").setRequired(true))
    .addStringOption(opt => opt.setName("duration").setDescription("Duration (e.g., 10m, 1h, 1d)").setRequired(true))
    .addStringOption(opt => opt.setName("reason").setDescription("Reason for the timeout"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction) {
    const targetUser = interaction.options.getUser("target");
    const durationStr = interaction.options.getString("duration");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (targetUser.id === interaction.user.id) return interaction.reply({ content: `${ERR} You cannot mute yourself.`, ephemeral: true });
    if (targetUser.id === interaction.client.user.id) return interaction.reply({ content: `${ERR} I cannot mute myself.`, ephemeral: true });

    const msDuration = ms(durationStr);
    if (!msDuration || msDuration < 10000 || msDuration > 2419200000) {
        return interaction.reply({ content: `${ERR} Invalid duration format. Provide a timeframe between 10 seconds (\`10s\`) and 28 days (\`28d\`).`, ephemeral: true });
    }

    try {
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) return interaction.reply({ content: `${ERR} User not found in this guild.`, ephemeral: true });

        if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
            return interaction.reply({ content: `${NO} **UNAUTHORIZED ACCESS:** Target possesses equal or higher clearance.`, ephemeral: true });
        }

        if (!member.moderatable) {
            return interaction.reply({ content: `${NO} **UNAUTHORIZED ACCESS:** My integrations sit below this member's highest role.`, ephemeral: true });
        }

        await member.timeout(msDuration, reason);

        await interaction.reply({ 
            content: `${OK} **Member Timed Out**\n\n**User:** ${targetUser.tag}\n**Duration:** ${durationStr}\n**Moderator:** ${interaction.user}\n**Reason:** *${reason}*` 
        });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: `${ERR} Critical failure running timeout sequence.`, ephemeral: true });
    }
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return message.reply(`${NO} Unauthorized Access.`);
    }

    const targetUser = await resolveUser(message, args[0]);
    const duration = args[1];
    if (!targetUser || !duration) {
        return message.reply(`${ERR} Usage: \`KV$mute @user <duration> [reason]\``);
    }

    return execute(buildPrefixInteraction(message, {
        values: {
            target: targetUser,
            duration,
            reason: restReason(args, 2)
        }
    }));
}

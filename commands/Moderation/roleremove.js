import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { buildPrefixInteraction, resolveRole, resolveUser } from "../prefixUtils.js";

const OK = '<:KVE_Authorized:1516458403411529788>';
const NO = '<:KVE_Unauthorized:1516457478651510976>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("roleremove")
    .setDescription("Strip a role from a server member.")
    .addUserOption(opt => opt.setName("target").setDescription("The user to modify").setRequired(true))
    .addRoleOption(opt => opt.setName("role").setDescription("The role to remove").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export async function execute(interaction) {
    const targetUser = interaction.options.getUser("target");
    const role = interaction.options.getRole("role");

    try {
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) return interaction.reply({ content: `${ERR} That user is not in this server.`, ephemeral: true });

        // Hierarchy Check: Moderator vs Role
        if (role.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
            return interaction.reply({ content: `${NO} **UNAUTHORIZED ACCESS:** You cannot remove a role that is equal to or higher than your own highest role.`, ephemeral: true });
        }

        // Hierarchy Check: Bot vs Role
        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({ content: `${NO} **UNAUTHORIZED ACCESS:** I cannot remove this role because it is positioned above mine.`, ephemeral: true });
        }

        if (!member.roles.cache.has(role.id)) {
            return interaction.reply({ content: `${ERR} That user does not have the **${role.name}** role.`, ephemeral: true });
        }

        await member.roles.remove(role);
        await interaction.reply({ content: `${OK} Successfully removed the role **${role.name}** from ${targetUser}.` });

    } catch (error) {
        console.error(error);
        await interaction.reply({ content: `${ERR} Failed to remove the role. Check configuration positions.`, ephemeral: true });
    }
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return message.reply(`${NO} Unauthorized Access.`);
    }

    const targetUser = await resolveUser(message, args[0]);
    const role = resolveRole(message, args[1]);
    if (!targetUser || !role) {
        return message.reply(`${ERR} Usage: \`KV$roleremove @user @role\``);
    }

    return execute(buildPrefixInteraction(message, {
        values: { target: targetUser, role }
    }));
}

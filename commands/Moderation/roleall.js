import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { buildPrefixInteraction, resolveRole } from "../prefixUtils.js";

const OK = '<:KVE_Authorized:1516458403411529788>';
const NO = '<:KVE_Unauthorized:1516457478651510976>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("roleall")
    .setDescription("Add a specific role to every human member in the server.")
    .addRoleOption(opt => opt.setName("role").setDescription("The role to distribute").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const role = interaction.options.getRole("role");

    if (role.id === interaction.guild.id || role.managed) {
        return interaction.reply({ content: `${NO}  **UNAUTHORIZED ACCESS:** Cannot assign this role type to everyone.`, ephemeral: true });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({ content: `${NO} **UNAUTHORIZED ACCESS:** This role is placed higher than my bot application integration role.`, ephemeral: true });
    }

    // Acknowledge the interaction early since bulk adding takes time
    await interaction.deferReply();

    try {
        const members = await interaction.guild.members.fetch();
        const humanMembers = members.filter(m => !m.user.bot && !m.roles.cache.has(role.id));

        if (humanMembers.size === 0) {
            return interaction.editReply({ content: `${ERR} Every human member in the server already possesses this role.` });
        }

        let processedCount = 0;
        // Process in sequential order to safely manage Discord API rate limits
        for (const [id, member] of humanMembers) {
            await member.roles.add(role).catch(() => {});
            processedCount++;
        }

        await interaction.editReply({ content: `${OK} **Bulk Action Complete:** Added the **${role.name}** role to **${processedCount}** human members.` });

    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: `${ERR} Critical failure during mass role deployment.` });
    }
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply(`${NO} Unauthorized Access.`);
    }

    const role = resolveRole(message, args[0]);
    if (!role) {
        return message.reply(`${ERR} Usage: \`KV$roleall @role\``);
    }

    return execute(buildPrefixInteraction(message, {
        values: { role }
    }));
}

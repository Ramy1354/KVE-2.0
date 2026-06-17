import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { buildPrefixInteraction } from "../prefixUtils.js";

const OK = '<:KVE_Authorized:1516458403411529788>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Bulk delete a specified number of messages in this channel.")
    .addIntegerOption(opt => opt.setName("amount").setDescription("Number of messages to clear (1-100)").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const amount = interaction.options.getInteger("amount");

    if (amount < 1 || amount > 100) {
        return interaction.reply({ content: `${ERR} Please provide an amount between 1 and 100.`, ephemeral: true });
    }

    try {
        const deleted = await interaction.channel.bulkDelete(amount, true);
        
        const reply = await interaction.reply({ 
            content: `${OK} Cleaned up **${deleted.size}** messages successfully. *(Messages older than 14 days skipped due to Discord policy)*`, 
            fetchReply: true 
        });

        setTimeout(() => reply.delete().catch(() => {}), 4000);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: `${ERR} Failed to purge messages in this channel context.`, ephemeral: true });
    }
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return message.reply(`${ERR} Unauthorized Access.`);
    }

    const amount = Number.parseInt(args[0], 10);
    if (Number.isNaN(amount)) {
        return message.reply(`${ERR} Usage: \`KV$purge <1-100>\``);
    }

    return execute(buildPrefixInteraction(message, {
        values: { amount }
    }));
}

import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { buildPrefixInteraction } from "../prefixUtils.js";

const OK = '<:KVE_Authorized:1516458403411529788>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("Modify the slowmode interval rate limit for this channel.")
    .addIntegerOption(opt => opt.setName("seconds").setDescription("Slowmode delay time in seconds (0 to turn off)").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction) {
    const seconds = interaction.options.getInteger("seconds");

    if (seconds < 0 || seconds > 21600) {
        return interaction.reply({ content: `${ERR} Invalid rate parameter. Slowmode cannot exceed 6 hours (\`21600\` seconds).`, ephemeral: true });
    }

    try {
        await interaction.channel.setRateLimitPerUser(seconds);

        if (seconds === 0) {
            await interaction.reply({ content: `${OK} Channel cooldown restrictions have been completely disabled.` });
        } else {
            await interaction.reply({ content: `${OK} Cooldown active. Users can now only send 1 message every **${seconds} seconds** in this channel.` });
        }
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: `${ERR} System failed to apply channel rate limits.`, ephemeral: true });
    }
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return message.reply(`${ERR} Unauthorized Access.`);
    }

    const seconds = Number.parseInt(args[0], 10);
    if (Number.isNaN(seconds)) {
        return message.reply(`${ERR} Usage: \`KV$slowmode <seconds>\``);
    }

    return execute(buildPrefixInteraction(message, {
        values: { seconds }
    }));
}

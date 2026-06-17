import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

const OK = '<:KVE_Approved:1516458503546339489>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Launches a quick Yes/No poll inside the channel.")
    .addStringOption(option =>
        option.setName("question")
            .setDescription("The question users will vote on")
            .setRequired(true)
    );

export async function execute(interaction) {
    await interaction.deferReply();

    const question = interaction.options.getString("question");

    const embed = new EmbedBuilder()
        .setColor("#FEE75C")
        .setTitle(`${OK} Server Poll`)
        .setDescription(`**${question}**`)
        .setFooter({ text: `Created by ${interaction.user.username}` })
        .setTimestamp();

    const response = await interaction.editReply({ embeds: [embed] });
    await response.react("👍");
    await response.react("👎");
}

export async function prefixExecute(message, args) {
    const question = args.join(" ");
    if (!question) return message.reply(`${ERR} **Please specify a poll question.**`);

    const embed = new EmbedBuilder()
        .setColor("#FEE75C")
        .setTitle(`${OK} Server Poll`)
        .setDescription(`**${question}**`)
        .setFooter({ text: `Created by ${message.author.username}` })
        .setTimestamp();

    const response = await message.reply({ embeds: [embed] });
    await response.react("👍");
    await response.react("👎");
}
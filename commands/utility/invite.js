import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const OK = '<:KVE_Approved:1516458503546339489>';

export const data = new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Get the invite link for the bot.");

export async function execute(interaction) {
    await interaction.deferReply();

    const inviteLink = `https://discord.com/oauth2/authorize?client_id=1516414357544767608&permissions=8&integration_type=0&scope=bot+applications.commands`;

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setDescription(`${OK} Click the button below to invite me to your server!`);

    const button = new ButtonBuilder()
        .setLabel("Invite Bot")
        .setURL(inviteLink)
        .setStyle(ButtonStyle.Link);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.editReply({ embeds: [embed], components: [row] });
}

export async function prefixExecute(message, args) {
    const inviteLink = `https://discord.com/oauth2/authorize?client_id=1516414357544767608&permissions=8&integration_type=0&scope=bot+applications.commands`;

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setDescription(`${OK} Click the button below to invite me to your server!`);

    const button = new ButtonBuilder()
        .setLabel("Invite Bot")
        .setURL(inviteLink)
        .setStyle(ButtonStyle.Link);

    const row = new ActionRowBuilder().addComponents(button);

    await message.reply({ embeds: [embed], components: [row] });
}
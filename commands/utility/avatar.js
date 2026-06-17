import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const OK = '<:KVE_Approved:1516458503546339489>';

export const data = new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Displays and provides download links for a user's profile avatar.")
    .addUserOption(option =>
        option.setName("user")
            .setDescription("The user whose avatar you want to view")
            .setRequired(false)
    );

export async function execute(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser("user") || interaction.user;
    const avatarUrl = user.displayAvatarURL({ dynamic: true, size: 4096 });

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`${OK} ${user.username}'s Avatar`)
        .setImage(avatarUrl);

    const button = new ButtonBuilder()
        .setLabel("Open High-Res Link")
        .setURL(avatarUrl)
        .setStyle(ButtonStyle.Link);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.editReply({ embeds: [embed], components: [row] });
}

export async function prefixExecute(message, args) {
    const user = message.mentions.users.first() || message.author;
    const avatarUrl = user.displayAvatarURL({ dynamic: true, size: 4096 });

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`${OK} ${user.username}'s Avatar`)
        .setImage(avatarUrl);

    const button = new ButtonBuilder()
        .setLabel("Open High-Res Link")
        .setURL(avatarUrl)
        .setStyle(ButtonStyle.Link);

    const row = new ActionRowBuilder().addComponents(button);

    await message.reply({ embeds: [embed], components: [row] });
}
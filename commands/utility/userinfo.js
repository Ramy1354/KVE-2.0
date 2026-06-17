import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

const OK = '<:KVE_Approved:1516458503546339489>';

export const data = new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Displays information about a user.")
    .addUserOption(option =>
        option.setName("user")
            .setDescription("The user to get information about")
            .setRequired(false)
    );

export async function execute(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser("user") || interaction.user;
    const member = interaction.guild?.members.cache.get(user.id);

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`${OK} User Information`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: "Username", value: user.tag, inline: true },
            { name: "ID", value: user.id, inline: true },
            { name: "Account Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: false }
        );

    if (member && member.joinedTimestamp) {
        embed.addFields({ name: "Joined Server", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: false });
    }

    await interaction.editReply({ embeds: [embed] });
}

export async function prefixExecute(message, args) {
    const user = message.mentions.users.first() || message.author;
    const member = message.guild?.members.cache.get(user.id);

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`${OK} User Information`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: "Username", value: user.tag, inline: true },
            { name: "ID", value: user.id, inline: true },
            { name: "Account Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: false }
        );

    if (member && member.joinedTimestamp) {
        embed.addFields({ name: "Joined Server", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: false });
    }

    await message.reply({ embeds: [embed] });
}
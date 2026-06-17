import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

const OK = '<:KVE_Approved:1516458503546339489>';

export const data = new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Displays information about this server.");

export async function execute(interaction) {
    await interaction.deferReply();

    const guild = interaction.guild;
    const owner = await guild.fetchOwner();

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`${OK} Server Information`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
            { name: "Server Name", value: guild.name, inline: true },
            { name: "Server ID", value: guild.id, inline: true },
            { name: "Owner", value: owner.user.tag, inline: true },
            { name: "Total Members", value: `${guild.memberCount}`, inline: true },
            { name: "Boosts", value: `${guild.premiumSubscriptionCount || 0} (Level ${guild.premiumTier})`, inline: true },
            { name: "Created On", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: false }
        );

    await interaction.editReply({ embeds: [embed] });
}

export async function prefixExecute(message, args) {
    const guild = message.guild;
    const owner = await guild.fetchOwner();

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`${OK} Server Information`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
            { name: "Server Name", value: guild.name, inline: true },
            { name: "Server ID", value: guild.id, inline: true },
            { name: "Owner", value: owner.user.tag, inline: true },
            { name: "Total Members", value: `${guild.memberCount}`, inline: true },
            { name: "Boosts", value: `${guild.premiumSubscriptionCount || 0} (Level ${guild.premiumTier})`, inline: true },
            { name: "Created On", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: false }
        );

    await message.reply({ embeds: [embed] });
}
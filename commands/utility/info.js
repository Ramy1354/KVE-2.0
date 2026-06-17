import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

const OK = '<:KVE_Approved:1516458503546339489>';

export const data = new SlashCommandBuilder()
    .setName("info")
    .setDescription("Displays information about the bot.");

export async function execute(interaction) {
    await interaction.deferReply();

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`${OK} Bot Information`)
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .addFields(
            { name: "Bot Tag", value: interaction.client.user.tag, inline: true },
            { name: "Servers Connected", value: `${interaction.client.guilds.cache.size}`, inline: true },
            { name: "Uptime", value: `${hours}h ${minutes}m ${seconds}s`, inline: false },
            { name: "Library", value: "Discord.js v14+", inline: true },
            { name: "Environment", value: "Node.js", inline: true }
        );

    await interaction.editReply({ embeds: [embed] });
}

export async function prefixExecute(message, args) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`${OK} Bot Information`)
        .setThumbnail(message.client.user.displayAvatarURL())
        .addFields(
            { name: "Bot Tag", value: message.client.user.tag, inline: true },
            { name: "Servers Connected", value: `${message.client.guilds.cache.size}`, inline: true },
            { name: "Uptime", value: `${hours}h ${minutes}m ${seconds}s`, inline: false },
            { name: "Library", value: "Discord.js v14+", inline: true },
            { name: "Environment", value: "Node.js", inline: true }
        );

    await message.reply({ embeds: [embed] });
}
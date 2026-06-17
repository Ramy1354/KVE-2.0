import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

const OK = '<:KVE_Approved:1516458503546339489>';

export const data = new SlashCommandBuilder()
    .setName("help")
    .setDescription("Displays a list of all available bot commands.");

export async function execute(interaction) {
    await interaction.deferReply();

    // Dynamically fetch all loaded commands
    const commands = interaction.client.commands;
    const commandList = Array.from(commands.values())
        .map(cmd => `**\`${cmd.data.name}\`** - ${cmd.data.description || "No description provided."}`)
        .join("\n");

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`${OK} KVE Command Help`)
        .setDescription(`You can trigger commands using \`/\` (Slash Commands) or \`!\` (Prefix Commands).\n\n💡 **Pro-Tip:** Mention me directly like \`@KVE <message>\` to chat with my AI engine!\n\n### Available Commands:\n${commandList}`)
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

export async function prefixExecute(message, args) {
    // Dynamically fetch all loaded commands
    const commands = message.client.commands;
    const commandList = Array.from(commands.values())
        .map(cmd => `**\`${cmd.data.name}\`** - ${cmd.data.description || "No description provided."}`)
        .join("\n");

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`${OK} KVE Command Help`)
        .setDescription(`You can trigger commands using \`/\` (Slash Commands) or \`!\` (Prefix Commands).\n\n💡 **Pro-Tip:** Mention me directly like \`@KVE <message>\` to chat with my AI engine!\n\n### Available Commands:\n${commandList}`)
        .setThumbnail(message.client.user.displayAvatarURL())
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}
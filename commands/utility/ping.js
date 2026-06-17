import { SlashCommandBuilder } from "discord.js";

const OK = '<:KVE_Approved:1516458503546339489>';

export const data = new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong and shows latency!");

export async function execute(interaction) {
    await interaction.deferReply();
    
    const botLatency = Date.now() - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply({
        content: `${OK} **Pong!**\n⏱️ **Bot Latency:** ${botLatency}ms\n💓 **API Latency:** ${apiLatency}ms`
    });
}

export async function prefixExecute(message, args) {
    const msg = await message.reply('⏱️ Calculating ping...');
    const botLatency = msg.createdTimestamp - message.createdTimestamp;
    const apiLatency = Math.round(message.client.ws.ping);
    
    await msg.edit(`${OK} **Pong!**\n⏱️ **Bot Latency:** ${botLatency}ms\n💓 **API Latency:** ${apiLatency}ms`);
}
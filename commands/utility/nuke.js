import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

const OK = '<:KVE_Authorized:1516458403411529788>';
const NO = '<:KVE_Unauthorized:1516457478651510976>';

export const data = new SlashCommandBuilder()
    .setName("nuke")
    .setDescription("Clones the current channel and deletes the old one to clear all messages.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction) {
    await interaction.deferReply();

    const channel = interaction.channel;
    const position = channel.position;

    const newChannel = await channel.clone();
    await newChannel.setPosition(position);
    await channel.delete();

    await newChannel.send({ content: `${OK} **Channel Nuked Successfully!**` });
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return message.reply(`${NO} Unauthorized Access.`);
    }

    const channel = message.channel;
    const position = channel.position;

    const newChannel = await channel.clone();
    await newChannel.setPosition(position);
    await channel.delete();

    await newChannel.send({ content: `${OK} **Channel Nuked Successfully!**` });
}
import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

const OK = '<:KVE_Authorized:1516458403411529788>';
const NO = '<:KVE_Unauthorized:1516457478651510976>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Locks the current channel to prevent messages from being sent.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction) {
    await interaction.deferReply();

    try {
        const channel = interaction.channel;
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: false,
        });
        await interaction.editReply({ content: `${OK} **Channel Locked Successfully!**` });
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: `${ERR} **Failed to lock the channel.**` });
    }
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return message.reply(`${NO} Unauthorized Access.`);
    }

    try {
        const channel = message.channel;
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
            SendMessages: false,
        });
        await message.reply({ content: `${OK} **Channel Locked Successfully!**` });
    } catch (error) {
        console.error(error);
        await message.reply({ content: `${ERR} **Failed to lock the channel.**` });
    }
}
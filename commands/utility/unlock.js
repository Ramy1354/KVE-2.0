import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

const OK = '<:KVE_Authorized:1516458403411529788>';
const NO = '<:KVE_Unauthorized:1516457478651510976>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlocks the current channel to allow messages to be sent again.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction) {
    await interaction.deferReply();

    try {
        const channel = interaction.channel;
        // Setting SendMessages to null inherits or removes the explicit 'false' override
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: null,
        });
        await interaction.editReply({ content: `${OK} **Channel Unlocked Successfully!**` });
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: `${ERR} **Failed to unlock the channel.**` });
    }
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return message.reply(`${NO} Unauthorized Access.`);
    }

    try {
        const channel = message.channel;
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
            SendMessages: null,
        });
        await message.reply({ content: `${OK} **Channel Unlocked Successfully!**` });
    } catch (error) {
        console.error(error);
        await message.reply({ content: `${ERR} **Failed to unlock the channel.**` });
    }
}
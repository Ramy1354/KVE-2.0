import { SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "canvas";

const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("wasted")
    .setDescription("Applies an ice-cold death screen overlay to a user or recent image.")
    .addUserOption(option => option.setName("target").setDescription("The user who met an unfortunate end"));

async function drawWastedCanvas(imageUrl) {
    const img = await loadImage(imageUrl);
    const canvas = createCanvas(500, 500);
    const ctx = canvas.getContext("2d");

    // 1. Draw the base image
    ctx.drawImage(img, 0, 0, 500, 500);

    // 2. Apply a dark, desaturated tint overlay
    ctx.fillStyle = "rgba(40, 40, 40, 0.45)";
    ctx.fillRect(0, 0, 500, 500);

    // 3. Draw the classic subtle gray horizontal banner streak across the middle
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 200, 500, 100);

    // 4. Configure the font tracking
    ctx.font = "italic bold 62px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Draw dark shadow outline behind text
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillText("WASTED", 253, 253);

    // Draw crisp red text over the top
    ctx.fillStyle = "#BC1313";
    ctx.fillText("WASTED", 500 / 2, 500 / 2);

    return canvas.toBuffer("image/png");
}

export async function execute(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getUser("target");
    let url;

    if (user) {
        url = user.displayAvatarURL({ extension: "png", size: 512 });
    } else {
        const messages = await interaction.channel.messages.fetch({ limit: 15 });
        const targetMessage = messages.find(m => m.attachments.size > 0);
        if (!targetMessage) return interaction.editReply(`${ERR} Mention a user or make sure an image was sent recently.`);
        url = targetMessage.attachments.first().url;
    }

    try {
        const buffer = await drawWastedCanvas(url);
        const attachment = new AttachmentBuilder(buffer, { name: "wasted.png" });
        await interaction.editReply({ files: [attachment] });
    } catch (err) {
        console.error(err);
        await interaction.editReply(`${ERR} Failed drawing canvas layers.`);
    }
}

export async function prefixExecute(message, args) {
    const user = message.mentions.users.first();
    let url;

    if (user) {
        url = user.displayAvatarURL({ extension: "png", size: 512 });
    } else if (message.attachments.size > 0) {
        url = message.attachments.first().url;
    } else {
        const messages = await message.channel.messages.fetch({ limit: 15 });
        const targetMessage = messages.find(m => m.attachments.size > 0);
        if (!targetMessage) return message.reply(`${ERR} I need a target picture.`);
        url = targetMessage.attachments.first().url;
    }

    try {
        const buffer = await drawWastedCanvas(url);
        const attachment = new AttachmentBuilder(buffer, { name: "wasted.png" });
        await message.reply({ files: [attachment] });
    } catch (err) {
        console.error(err);
        await message.reply(`${ERR} Failed drawing.`);
    }
}
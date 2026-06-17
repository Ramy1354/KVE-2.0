import { SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "canvas";

const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("beautiful")
    .setDescription("Admire a masterpiece (or a tragedy) inside a painting frame.")
    .addUserOption(option => option.setName("target").setDescription("The user whose avatar belongs in the frame"));

async function drawBeautifulCanvas(imageUrl) {
    // Standard template size
    const canvas = createCanvas(600, 461);
    const ctx = canvas.getContext("2d");

    // Load the target image and the background asset layout sequentially
    const targetImg = await loadImage(imageUrl);
    
    // We draw an artificial background color inside the frame zone first
    ctx.fillStyle = "#333333";
    ctx.fillRect(0, 0, 600, 461);

    // 1. Draw the user's image distorted/rotated slightly to match the frame coordinates
    // Frame box approximations: X: 260, Y: 70, Width: 300, Height: 260
    ctx.save();
    ctx.translate(260, 70);
    ctx.rotate(0.04); // Slight angle adjustment to align with the canvas painting skew
    ctx.drawImage(targetImg, 0, 0, 290, 240);
    ctx.restore();

    // 2. Draw an overlay framework mimicking Stan holding the paper
    // Since we don't want to rely on an external image URL host that might break,
    // we build a minimalist sketch border frame over it.
    ctx.lineWidth = 14;
    ctx.strokeStyle = "#4E3629"; // Wooden frame color
    ctx.strokeRect(260, 70, 290, 240);
    
    // Paper border line
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#FFFFFF";
    ctx.strokeRect(255, 65, 300, 250);

    return canvas.toBuffer("image/png");
}

export async function execute(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getUser("target");
    let url;

    if (user) {
        url = user.displayAvatarURL({ extension: "png", size: 256 });
    } else {
        const messages = await interaction.channel.messages.fetch({ limit: 15 });
        const targetMessage = messages.find(m => m.attachments.size > 0);
        if (!targetMessage) return interaction.editReply(`${ERR} I need a target image or user.`);
        url = targetMessage.attachments.first().url;
    }

    try {
        const buffer = await drawBeautifulCanvas(url);
        const attachment = new AttachmentBuilder(buffer, { name: "beautiful.png" });
        await interaction.editReply({ files: [attachment] });
    } catch (err) {
        console.error(err);
        await interaction.editReply(`${ERR} Failed drawing masterpiece.`);
    }
}

export async function prefixExecute(message, args) {
    const user = message.mentions.users.first();
    let url;

    if (user) {
        url = user.displayAvatarURL({ extension: "png", size: 256 });
    } else if (message.attachments.size > 0) {
        url = message.attachments.first().url;
    } else {
        const messages = await message.channel.messages.fetch({ limit: 15 });
        const targetMessage = messages.find(m => m.attachments.size > 0);
        if (!targetMessage) return message.reply(`${ERR} Attach or mention something.`);
        url = targetMessage.attachments.first().url;
    }

    try {
        const buffer = await drawBeautifulCanvas(url);
        const attachment = new AttachmentBuilder(buffer, { name: "beautiful.png" });
        await message.reply({ files: [attachment] });
    } catch (err) {
        console.error(err);
        await message.reply(`${ERR} Drawing failed.`);
    }
}
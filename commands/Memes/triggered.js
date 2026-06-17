import { SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "canvas";

const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("triggered")
    .setDescription("Forces a chaotic, red-tinted upset state overlay onto a target.")
    .addUserOption(option => option.setName("target").setDescription("The user who lost their cool"));

async function drawTriggeredCanvas(imageUrl) {
    const img = await loadImage(imageUrl);
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext("2d");

    // Create motion offset variables to simulate a chaotic "shake" frame freeze
    const offsetX = Math.floor(Math.random() * 12) - 6;
    const offsetY = Math.floor(Math.random() * 12) - 6;

    // 1. Draw base image with chaotic pixel shift translation
    ctx.drawImage(img, offsetX, offsetY, 400 + Math.abs(offsetX), 400 + Math.abs(offsetY));

    // 2. Add high-opacity pure red industrial alert filter tint
    ctx.fillStyle = "rgba(255, 0, 0, 0.35)";
    ctx.fillRect(0, 0, 400, 400);

    // 3. Draw the bottom banner bar block
    ctx.fillStyle = "#F14141";
    ctx.fillRect(0, 320, 400, 80);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 325, 400, 70);

    // 4. Draw text properties
    ctx.font = "bold 46px Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // White text inner layout
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("TRIGGERED", 400 / 2, 360);

    return canvas.toBuffer("image/png");
}

export async function execute(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getUser("target") || interaction.user;
    const url = user.displayAvatarURL({ extension: "png", size: 256 });

    try {
        const buffer = await drawTriggeredCanvas(url);
        const attachment = new AttachmentBuilder(buffer, { name: "triggered.png" });
        await interaction.editReply({ files: [attachment] });
    } catch (err) {
        console.error(err);
        await interaction.editReply(`${ERR} Canvas tint compilation failed.`);
    }
}

export async function prefixExecute(message, args) {
    const user = message.mentions.users.first() || message.author;
    const url = user.displayAvatarURL({ extension: "png", size: 256 });

    try {
        const buffer = await drawTriggeredCanvas(url);
        const attachment = new AttachmentBuilder(buffer, { name: "triggered.png" });
        await message.reply({ files: [attachment] });
    } catch (err) {
        console.error(err);
        await message.reply(`${ERR} Logic error.`);
    }
}
import { SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "canvas";

const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("wanted")
    .setDescription("Places an official, high-bounty bounty poster on a user.")
    .addUserOption(option => option.setName("target").setDescription("The outlaw in question"));

async function drawWantedPoster(avatarUrl, username) {
    // Canvas dimensions matching standard portrait poster ratio
    const width = 400;
    const height = 550;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // 1. Fill base with a vintage, parchment-brown color palette
    ctx.fillStyle = "#E4D3B2";
    ctx.fillRect(0, 0, width, height);

    // Vintage inner border outlines
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#4E3629";
    ctx.strokeRect(15, 15, width - 30, height - 30);
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // 2. Draw Poster Core Headings
    ctx.fillStyle = "#4E3629";
    ctx.textAlign = "center";
    
    ctx.font = "bold 44px Georgia, serif";
    ctx.fillText("WANTED", width / 2, 70);

    ctx.font = "bold 16px Georgia, serif";
    ctx.fillText("DEAD OR ALIVE", width / 2, 105);

    // 3. Render and embed the target user's avatar in the center
    const avatar = await loadImage(avatarUrl);
    const avatarSize = 220;
    const avatarX = (width - avatarSize) / 2;
    const avatarY = 135;

    // Outer framing boundary for the profile pic slot
    ctx.fillStyle = "#4E3629";
    ctx.fillRect(avatarX - 5, avatarY - 5, avatarSize + 10, avatarSize + 10);
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);

    // 4. Draw Identity and Bounty Reward lines
    ctx.font = "italic bold 22px Georgia, serif";
    // Sanitize username to stay completely uppercase inside the theme
    ctx.fillText(`"${username.toUpperCase()}"`, width / 2, 400);

    ctx.font = "bold 26px Georgia, serif";
    ctx.fillText("REWARD $50,000", width / 2, 460);

    ctx.font = "12px Georgia, serif";
    ctx.fillText("FOR CRIMES AGAINST THE INTELLECT MATRIX", width / 2, 500);

    return canvas.toBuffer("image/png");
}

export async function execute(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getUser("target") || interaction.user;
    const avatarUrl = user.displayAvatarURL({ extension: "png", size: 256 });

    try {
        const buffer = await drawWantedPoster(avatarUrl, user.username);
        const attachment = new AttachmentBuilder(buffer, { name: "wanted.png" });
        await interaction.editReply({ files: [attachment] });
    } catch (err) {
        console.error(err);
        await interaction.editReply(`${ERR} Poster generation crashed.`);
    }
}

export async function prefixExecute(message, args) {
    const user = message.mentions.users.first() || message.author;
    const avatarUrl = user.displayAvatarURL({ extension: "png", size: 256 });

    try {
        const buffer = await drawWantedPoster(avatarUrl, user.username);
        const attachment = new AttachmentBuilder(buffer, { name: "wanted.png" });
        await message.reply({ files: [attachment] });
    } catch (err) {
        console.error(err);
        await message.reply(`${ERR} Poster generation failed.`);
    }
}
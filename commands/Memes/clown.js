import { SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "canvas";

const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("clown")
    .setDescription("Exposes a user for what they truly look like via canvas elements.")
    .addUserOption(option => option.setName("target").setDescription("The user to clown on"));

async function drawClownPfp(avatarUrl) {
    const avatar = await loadImage(avatarUrl);
    
    // Force a uniform size canvas for profiling assets
    const canvas = createCanvas(256, 256);
    const ctx = canvas.getContext("2d");

    // 1. Paint base avatar profile picture
    ctx.drawImage(avatar, 0, 0, 256, 256);

    // 2. Draw Left & Right Red Clown Wig Hair circles
    ctx.fillStyle = "rgba(255, 51, 51, 0.9)";
    ctx.beginPath();
    ctx.arc(45, 90, 40, 0, Math.PI * 2, true); // Left wig bundle
    ctx.arc(211, 90, 40, 0, Math.PI * 2, true); // Right wig bundle
    ctx.fill();

    // 3. Draw Red Nose directly in the middle
    ctx.fillStyle = "#E60000";
    ctx.beginPath();
    ctx.arc(128, 140, 24, 0, Math.PI * 2, true);
    ctx.fill();

    return canvas.toBuffer("image/png");
}

export async function execute(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getUser("target") || interaction.user;
    const avatarUrl = user.displayAvatarURL({ extension: "png", size: 256 });

    try {
        const buffer = await drawClownPfp(avatarUrl);
        const attachment = new AttachmentBuilder(buffer, { name: "clown.png" });
        await interaction.editReply({ content: `Accurate data found for ${user.username}.`, files: [attachment] });
    } catch (err) {
        console.error(err);
        await interaction.editReply(`${ERR} Canvas execution crashed.`);
    }
}

export async function prefixExecute(message, args) {
    const user = message.mentions.users.first() || message.author;
    const avatarUrl = user.displayAvatarURL({ extension: "png", size: 256 });

    try {
        const buffer = await drawClownPfp(avatarUrl);
        const attachment = new AttachmentBuilder(buffer, { name: "clown.png" });
        await message.reply({ content: "Depicting current target matrix:", files: [attachment] });
    } catch (err) {
        console.error(err);
        await message.reply(`${ERR} Canvas failure.`);
    }
}
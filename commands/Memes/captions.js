import { SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const OK = '<:KVE_Approved:1516458503546339489>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("caption")
    .setDescription("Adds a classic meme caption to an image.")
    .addStringOption(option => 
        option.setName("text")
            .setDescription("The caption text to put above the image")
            .setRequired(true))
    .addAttachmentOption(option => 
        option.setName("image")
            .setDescription("The image to caption")
            .setRequired(true));

export async function execute(interaction) {
    await interaction.deferReply();

    try {
        const text = interaction.options.getString("text");
        const imageAttachment = interaction.options.getAttachment("image");

        if (!imageAttachment.contentType?.startsWith("image/")) {
            return interaction.editReply({ content: `${ERR} **Please upload a valid image file!**` });
        }

        const srcImage = await loadImage(imageAttachment.url);
        const width = srcImage.width;
        const captionBoxHeight = Math.max(60, Math.floor(srcImage.height * 0.22)); 
        const totalHeight = srcImage.height + captionBoxHeight;

        const canvas = createCanvas(width, totalHeight);
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, captionBoxHeight);
        ctx.drawImage(srcImage, 0, captionBoxHeight, width, srcImage.height);

        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const fontSize = Math.floor(captionBoxHeight * 0.35);
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;

        const words = text.split(" ");
        let line = "";
        const lines = [];
        const maxWidth = width * 0.9;

        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + " ";
            let metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + " ";
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        const lineHeight = fontSize * 1.2;
        const startY = (captionBoxHeight - (lines.length - 1) * lineHeight) / 2;

        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i].trim(), width / 2, startY + (i * lineHeight));
        }

        const buffer = canvas.toBuffer("image/jpeg");
        const attachment = new AttachmentBuilder(buffer, { name: "caption-meme.jpeg" });

        await interaction.editReply({ content: `${OK} **Meme generated successfully!**`, files: [attachment] });

    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: `${ERR} **Something went wrong while generating your meme.**` });
    }
}

export async function prefixExecute(message, args) {
    const imageAttachment = message.attachments.first();
    const text = args.join(" ");

    if (!imageAttachment || !imageAttachment.contentType?.startsWith("image/")) {
        return message.reply(`${ERR} **You must attach an image alongside the command!**`);
    }
    if (!text) {
        return message.reply(`${ERR} **Please provide text for your caption.**`);
    }

    const msg = await message.reply("🎨 Generating meme...");

    try {
        const srcImage = await loadImage(imageAttachment.url);
        const width = srcImage.width;
        const captionBoxHeight = Math.max(60, Math.floor(srcImage.height * 0.22));
        const totalHeight = srcImage.height + captionBoxHeight;

        const canvas = createCanvas(width, totalHeight);
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, captionBoxHeight);
        ctx.drawImage(srcImage, 0, captionBoxHeight, width, srcImage.height);

        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const fontSize = Math.floor(captionBoxHeight * 0.35);
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;

        const words = text.split(" ");
        let line = "";
        const lines = [];
        const maxWidth = width * 0.9;

        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + " ";
            let metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + " ";
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        const lineHeight = fontSize * 1.2;
        const startY = (captionBoxHeight - (lines.length - 1) * lineHeight) / 2;

        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i].trim(), width / 2, startY + (i * lineHeight));
        }

        const buffer = canvas.toBuffer("image/jpeg");
        const attachment = new AttachmentBuilder(buffer, { name: "caption-meme.jpeg" });

        await msg.edit({ content: `${OK} **Here is your meme:**`, files: [attachment] });
    } catch (error) {
        console.error(error);
        await msg.edit({ content: `${ERR} **Something went wrong while generating your meme.**` });
    }
}
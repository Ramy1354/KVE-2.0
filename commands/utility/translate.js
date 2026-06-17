import { SlashCommandBuilder } from "discord.js";
import { translate } from "@vitalets/google-translate-api";

const OK = '<:KVE_Approved:1516458503546339489>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("translate")
    .setDescription("Translates text into a target language.")
    .addStringOption(option =>
        option.setName("text")
            .setDescription("The text you want to translate")
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName("to")
            .setDescription("The target language code (e.g., en, es, fr, ar, ja)")
            .setRequired(true)
    );

export async function execute(interaction) {
    await interaction.deferReply();

    try {
        const text = interaction.options.getString("text");
        const targetLang = interaction.options.getString("to").toLowerCase();

        const res = await translate(text, { to: targetLang });

        await interaction.editReply({
            content: `${OK} **Translation Successful!**\n\n**Original (${res.raw.src}):** ${text}\n**Translated (${targetLang}):** ${res.text}`
        });
    } catch (error) {
        console.error(error);
        await interaction.editReply({
            content: `${ERR} **Failed to translate. Make sure you used a valid language code.**`
        });
    }
}

export async function prefixExecute(message, args) {
    if (args.length < 2) {
        return message.reply(`${ERR} **Invalid Usage!** Use: \`!translate <lang_code> <text>\`\n*Example: \`!translate es Hello friends\`*`);
    }

    const targetLang = args[0].toLowerCase();
    const text = args.slice(1).join(" ");

    const msg = await message.reply("🌐 Translating text...");

    try {
        const res = await translate(text, { to: targetLang });

        await msg.edit({
            content: `${OK} **Translation Successful!**\n\n**Original (${res.raw.src}):** ${text}\n**Translated (${targetLang}):** ${res.text}`
        });
    } catch (error) {
        console.error(error);
        await msg.edit({
            content: `${ERR} **Failed to translate. Make sure you used a valid language code.**`
        });
    }
}
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import db from "../../database.js";
import { buildPrefixInteraction, resolveChannel } from "../prefixUtils.js";

const OK = '<:KVE_Authorized:1516458403411529788>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("setgreetings")
    .setDescription("Configure custom media embeds for welcomes and departures.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
        sub.setName("welcome")
            .setDescription("Modify welcome alerts.")
            .addChannelOption(o => o.setName("channel").setDescription("Target logging channel").setRequired(true))
            .addStringOption(o => o.setName("message").setDescription("Message script. Placeholders: {user}, {server}, {count}").setRequired(true))
            .addStringOption(o => o.setName("image").setDescription("Large banner URL / GIF link").setRequired(false))
            .addStringOption(o => o.setName("thumbnail").setDescription("Small thumbnail image URL (Type 'avatar' to use user's profile photo)").setRequired(false))
            .addStringOption(o => o.setName("footer").setDescription("Footer text layout").setRequired(false))
            .addStringOption(o => o.setName("color").setDescription("Embed border Hex color (e.g., #FF0055)").setRequired(false))
    )
    .addSubcommand(sub =>
        sub.setName("goodbye")
            .setDescription("Modify goodbye alerts.")
            .addChannelOption(o => o.setName("channel").setDescription("Target logging channel").setRequired(true))
            .addStringOption(o => o.setName("message").setDescription("Departure script. Placeholders: {user}, {server}, {count}").setRequired(true))
            .addStringOption(o => o.setName("image").setDescription("Large banner URL / GIF link").setRequired(false))
            .addStringOption(o => o.setName("thumbnail").setDescription("Small thumbnail image URL (Type 'avatar' to use user's profile photo)").setRequired(false))
            .addStringOption(o => o.setName("footer").setDescription("Footer text layout").setRequired(false))
            .addStringOption(o => o.setName("color").setDescription("Embed border Hex color (e.g., #E74C3C)").setRequired(false))
    )
    .addSubcommand(sub =>
        sub.setName("status")
            .setDescription("View server tracking layout configurations.")
    );

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    db.prepare(`INSERT OR IGNORE INTO welcome_settings (guild_id) VALUES (?)`).run(gid);

    if (subcommand === "welcome" || subcommand === "goodbye") {
        const channel = interaction.options.getChannel("channel");
        const msg = interaction.options.getString("message");
        const img = interaction.options.getString("image") || null;
        const thumb = interaction.options.getString("thumbnail") || null;
        const foot = interaction.options.getString("footer") || null;
        let color = interaction.options.getString("color") || (subcommand === "welcome" ? "#2ECC71" : "#E74C3C");

        if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
            return interaction.reply({ content: `${ERR} Invalid Hex format. Colors must look like \"#FF5500\" or \"#2ECC71\".`, ephemeral: true });
        }

        db.prepare(`
            UPDATE welcome_settings 
            SET ${subcommand}_channel_id = ?, ${subcommand}_message = ?, 
                ${subcommand}_image = ?, ${subcommand}_thumbnail = ?, 
                ${subcommand}_footer = ?, ${subcommand}_color = ?
            WHERE guild_id = ?
        `).run(channel.id, msg, img, thumb, foot, color, gid);

        return interaction.reply({
            content: `${OK} **${subcommand.toUpperCase()} matrix asset variables locked.** Modifications saved successfully.`,
            ephemeral: true
        });
    }

    if (subcommand === "status") {
        const config = db.prepare("SELECT * FROM welcome_settings WHERE guild_id = ?").get(gid);
        if (!config) return interaction.reply({ content: `${ERR} Configurations do not exist yet. Run settings allocations first.`, ephemeral: true });

        const statusEmbed = new EmbedBuilder()
            .setColor("#34495E")
            .setTitle("⚙️ Server Identity Welcome/Goodbye Config Hub")
            .addFields(
                { name: "👋 Welcome Target", value: config.welcome_channel_id ? `<#${config.welcome_channel_id}>` : "🚫 *Disabled*", inline: true },
                { name: "😢 Goodbye Target", value: config.goodbye_channel_id ? `<#${config.goodbye_channel_id}>` : "🚫 *Disabled*", inline: true },
                { name: "🖼️ Welcome Assets", value: `• **Image/GIF:** ${config.welcome_image ? `[Link](${config.welcome_image})` : "*None*"}\n• **Thumb:** \`${config.welcome_thumbnail || "None"}\`\n• **Color:** \`${config.welcome_color}\`` },
                { name: "🖼️ Goodbye Assets", value: `• **Image/GIF:** ${config.goodbye_image ? `[Link](${config.goodbye_image})` : "*None*"}\n• **Thumb:** \`${config.goodbye_thumbnail || "None"}\`\n• **Color:** \`${config.goodbye_color}\`` }
            );

        return interaction.reply({ embeds: [statusEmbed], ephemeral: true });
    }
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply(`${ERR} Unauthorized Access.`);
    }

    const subcommand = args[0]?.toLowerCase();
    if (subcommand === "status") {
        return execute(buildPrefixInteraction(message, { subcommand }));
    }

    const channel = resolveChannel(message, args[1]);
    const rawDetails = args.slice(2).join(" ");
    const [msg, img = null, thumb = null, foot = null, colorInput = null] = rawDetails.split("|").map(part => part.trim());
    const color = colorInput || null;

    if (!["welcome", "goodbye"].includes(subcommand) || !channel || !msg) {
        return message.reply(`${ERR} Usage: \`KV$setgreetings <welcome|goodbye> #channel <message> [| image] [| thumbnail] [| footer] [| #color]\``);
    }

    return execute(buildPrefixInteraction(message, {
        subcommand,
        values: {
            channel,
            message: msg,
            image: img,
            thumbnail: thumb,
            footer: foot,
            color
        }
    }));
}

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from "discord.js";
import db from "../../database.js";
import { buildPrefixInteraction, resolveChannel, resolveRole } from "../prefixUtils.js";

const ERR = '<:KVE_ERROR:1516460442149720184>';
const OK = '<:KVE_Approved:1516458503546339489>';

export const data = new SlashCommandBuilder()
    .setName("setup-tickets")
    .setDescription("Deploy the full production-grade TicketTool support dashboard.")
    .addChannelOption(option => option.setName("panel-channel").setDescription("Where the creation banner is deployed").setRequired(true))
    .addChannelOption(option => option.setName("category").setDescription("Category container for active tickets").setRequired(true))
    .addRoleOption(option => option.setName("staff-role").setDescription("Support squad/staff role authorized to view tickets").setRequired(true))
    .addChannelOption(option => option.setName("transcripts").setDescription("Channel where closed ticket logs and text transcripts stream").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const panelChannel = interaction.options.getChannel("panel-channel");
    const category = interaction.options.getChannel("category");
    const staffRole = interaction.options.getRole("staff-role");
    const transcriptChannel = interaction.options.getChannel("transcripts");

    db.prepare(`
        INSERT INTO ticket_settings (guild_id, category_id, staff_role_id, panel_channel_id, transcript_channel_id)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET
            category_id = excluded.category_id,
            staff_role_id = excluded.staff_role_id,
            panel_channel_id = excluded.panel_channel_id,
            transcript_channel_id = excluded.transcript_channel_id
    `).run(interaction.guildId, category.id, staffRole.id, panelChannel.id, transcriptChannel.id);

    const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("✉️ Support & Help Desk")
        .setDescription("Click the button below to initialize a highly secure, private communication line with our technical assistance team.")
        .addFields({ name: "🛡️ Moderation Assurance", value: "All transcript data loops securely into system logs upon wrap-up processing.", inline: false })
        .setFooter({ text: "TicketTool Integrated System Matrix", iconURL: interaction.guild.iconURL() });

    const openButton = new ButtonBuilder()
        .setCustomId("tt_open")
        .setLabel("Create Ticket")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📩");

    const row = new ActionRowBuilder().addComponents(openButton);

    try {
        await panelChannel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: `${OK} **TicketTool configurations compiled successfully.** Panel live in ${panelChannel}.`, ephemeral: true });
    } catch (err) {
        console.error(err);
        await interaction.reply({ content: `${ERR} Failed to render layouts in designated zone.`, ephemeral: true });
    }
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply(`${ERR} Unauthorized Access.`);
    }

    const panelChannel = resolveChannel(message, args[0]);
    const category = resolveChannel(message, args[1]);
    const staffRole = resolveRole(message, args[2]);
    const transcriptChannel = resolveChannel(message, args[3]);
    if (!panelChannel || !category || !staffRole || !transcriptChannel) {
        return message.reply(`${ERR} Usage: \`KV$setup-tickets #panel-channel <category-id> @staff-role #transcripts\``);
    }

    return execute(buildPrefixInteraction(message, {
        values: {
            "panel-channel": panelChannel,
            category,
            "staff-role": staffRole,
            transcripts: transcriptChannel
        }
    }));
}

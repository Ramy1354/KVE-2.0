import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
import db from "../../database.js";
import { buildPrefixInteraction, resolveChannel, resolveRole } from "../prefixUtils.js";

const OK = '<:KVE_Authorized:1516458403411529788>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("setup-verification")
    .setDescription("Initialize the button verification terminal gateway panel.")
    .addChannelOption(opt => opt.setName("channel").setDescription("The verification gate landing page channel").setRequired(true))
    .addRoleOption(opt => opt.setName("role").setDescription("The role given upon passing verification").setRequired(true))
    .addStringOption(opt => opt.setName("mode")
        .setDescription("Type of challenge verification process to use")
        .setRequired(true)
        .addChoices(
            { name: "🧮 Math Equation Captcha", value: "CAPTCHA" },
            { name: "🔢 Numeric Identification Digit Code", value: "NUMBERS" },
            { name: "🔤 Mixed Alphanumeric Code", value: "ALPHANUMERIC" }
        ))
    .addIntegerOption(opt => opt.setName("delivery")
        .setDescription("Where to process verification prompts")
        .setRequired(true)
        .addChoices(
            { name: "💬 Server Channel (Invisible Ephemeral Message)", value: 0 },
            { name: "📩 Direct Messages (DMs)", value: 1 }
        ))
    .addRoleOption(opt => opt.setName("unverified-role").setDescription("Optional: Auto-role assigned to new joins that gets removed on success").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const channel = interaction.options.getChannel("channel");
    const role = interaction.options.getRole("role");
    const mode = interaction.options.getString("mode");
    const delivery = interaction.options.getInteger("delivery");
    const unverifiedRole = interaction.options.getRole("unverified-role");

    if (role.position >= interaction.guild.members.me.roles.highest.position || 
        (unverifiedRole && unverifiedRole.position >= interaction.guild.members.me.roles.highest.position)) {
        return interaction.reply({ 
            content: `${ERR} **Hierarchy Error:** One of those roles sits equal to or higher than my application integration tier rank.`, 
            flags: MessageFlags.Ephemeral
        });
    }

    try {
        db.prepare(`
            INSERT INTO verification_settings (guild_id, role_id, channel_id, mode, use_dms, unverified_role_id) 
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(guild_id) DO UPDATE SET 
                role_id = excluded.role_id, 
                channel_id = excluded.channel_id, 
                mode = excluded.mode, 
                use_dms = excluded.use_dms,
                unverified_role_id = excluded.unverified_role_id
        `).run(interaction.guild.id, role.id, channel.id, mode, delivery, unverifiedRole ? unverifiedRole.id : null);

        const verifyEmbed = new EmbedBuilder()
            .setColor("#2ECC71")
            .setTitle("🛡️ Security Verification Gateway Portal")
            .setDescription("To protect this environment against automated bot accounts and gain server clearance, click the **Verify** button below to complete the security assessment challenge.")
            .addFields(
                { name: "📝 Verification Challenge Type", value: `\`${mode}\``, inline: true },
                { name: "📦 Prompt Processing Delivery", value: delivery === 1 ? "📩 Private Direct Messages" : "💬 Ephemeral In-Channel UI", inline: true },
                { name: "🎭 Auto-Join Restriction Role", value: unverifiedRole ? `${unverifiedRole}` : "*None Linked*", inline: false }
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("verify_gate_trigger")
                .setLabel("Begin Verification Process")
                .setStyle(ButtonStyle.Success)
                .setEmoji("🛡️")
        );

        await channel.send({ embeds: [verifyEmbed], components: [row] });

        await interaction.reply({ 
            content: `${OK} **System configurations successfully written.** Security portal established inside ${channel}.`, 
            flags: MessageFlags.Ephemeral
        });

    } catch (error) {
        console.error(error);
        await interaction.reply({ content: `${ERR} Exception configuring security parameters.`, flags: MessageFlags.Ephemeral });
    }
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply(`${ERR} Unauthorized Access.`);
    }

    const channel = resolveChannel(message, args[0]);
    const role = resolveRole(message, args[1]);
    const mode = args[2]?.toUpperCase();
    const deliveryInput = args[3]?.toLowerCase();
    const delivery = deliveryInput === "dm" || deliveryInput === "dms" || deliveryInput === "1" ? 1 : 0;
    const unverifiedRole = args[4] ? resolveRole(message, args[4]) : null;

    if (!channel || !role || !["CAPTCHA", "NUMBERS", "ALPHANUMERIC"].includes(mode) || !deliveryInput) {
        return message.reply(`${ERR} Usage: \`KV$setup-verification #channel @verified-role <captcha|numbers|alphanumeric> <channel|dm> [@unverified-role]\``);
    }

    return execute(buildPrefixInteraction(message, {
        values: {
            channel,
            role,
            mode,
            delivery,
            "unverified-role": unverifiedRole
        }
    }));
}

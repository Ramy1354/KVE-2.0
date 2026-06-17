import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from "discord.js";
import db from "../../database.js";
import { buildPrefixInteraction, resolveChannel, resolveRole } from "../prefixUtils.js";

const OK = '<:KVE_Authorized:1516458403411529788>';
const NO = '<:KVE_Unauthorized:1516457478651510976>';
const ERR = '<:KVE_ERROR:1516460442149720184>';

export const data = new SlashCommandBuilder()
    .setName("automod-config")
    .setDescription("Toggle security parameters and control dynamic server whitelists.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // Subcommand: Toggle modules
    .addSubcommand(sub => sub
        .setName("toggle")
        .setDescription("Turn structural automod protection filters on or off.")
        .addStringOption(opt => opt.setName("feature").setDescription("Target filter matrix element").setRequired(true)
            .addChoices(
                { name: "Slurs Protection Rule", value: "slur_filter" },
                { name: "Regular Links Filter", value: "link_filter" },
                { name: "Server Invites Filter", value: "invite_filter" },
                { name: "Anti-Spam Shield", value: "spam_filter" },
                { name: "Explicit/NSFW Scan", value: "nsfw_filter" }
            ))
        .addBooleanOption(opt => opt.setName("state").setDescription("Active processing truth flag value").setRequired(true)))
    // Subcommand: Manage blocked strings
    .addSubcommand(sub => sub
        .setName("words")
        .setDescription("Modify server custom tracked banned text arrays.")
        .addStringOption(opt => opt.setName("action").setDescription("Select matrix edit path action").setRequired(true)
            .addChoices(
                { name: "Block Word Element", value: "add" },
                { name: "Unblock Word Element", value: "remove" }
            ))
        .addStringOption(opt => opt.setName("string").setDescription("The word or sequence to execute configuration against").setRequired(true)))
    // Subcommand: Manage Whitelists
    .addSubcommand(sub => sub
        .setName("exclude")
        .setDescription("Manage structural exceptions across text channels or roles.")
        .addStringOption(opt => opt.setName("type").setDescription("Target whitelist asset type value").setRequired(true)
            .addChoices(
                { name: "Channel Exception Rule", value: "channel" },
                { name: "Role Exception Rule", value: "role" }
            ))
        .addStringOption(opt => opt.setName("action").setDescription("Target step adjustment directive option").setRequired(true)
            .addChoices(
                { name: "Add (Authorize Whitelist)", value: "add" },
                { name: "Remove (Enforce Filter Here)", value: "remove" }
            ))
        .addChannelOption(opt => opt.setName("channel").setDescription("Target channel context value item").addChannelTypes(ChannelType.GuildText))
        .addRoleOption(opt => opt.setName("role").setDescription("Target role configuration context value item")));

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    db.prepare("INSERT OR IGNORE INTO automod_config (guild_id) VALUES (?)").run(guildId);
    let currentConfig = db.prepare("SELECT * FROM automod_config WHERE guild_id = ?").get(guildId);

    if (subcommand === "toggle") {
        const feature = interaction.options.getString("feature");
        const state = interaction.options.getBoolean("state") ? 1 : 0;

        db.prepare(`UPDATE automod_config SET ${feature} = ? WHERE guild_id = ?`).run(state, guildId);
        return interaction.reply({ 
            content: `${state ? OK : NO} Automod dynamic matrix property **${feature}** changed to: **${state ? "ENABLED" : "DISABLED"}**.`, 
            ephemeral: true 
        });
    }

    if (subcommand === "words") {
        const action = interaction.options.getString("action");
        const stringVal = interaction.options.getString("string").toLowerCase().trim();
        let blockedArray = JSON.parse(currentConfig.blocked_words || "[]");

        if (action === "add") {
            if (blockedArray.includes(stringVal)) return interaction.reply({ content: `${ERR} String match token already loaded on system indices.`, ephemeral: true });
            blockedArray.push(stringVal);
        } else {
            if (!blockedArray.includes(stringVal)) return interaction.reply({ content: `${ERR} Target entry was not detected on tracked custom indices.`, ephemeral: true });
            blockedArray = blockedArray.filter(w => w !== stringVal);
        }

        db.prepare("UPDATE automod_config SET blocked_words = ? WHERE guild_id = ?").run(JSON.stringify(blockedArray), guildId);
        return interaction.reply({ content: `${OK} **Blacklist Synchronized.** Config altered successfully for word token value \`${stringVal}\`.`, ephemeral: true });
    }

    if (subcommand === "exclude") {
        const type = interaction.options.getString("type");
        const action = interaction.options.getString("action");
        const chTarget = interaction.options.getChannel("channel");
        const rlTarget = interaction.options.getRole("role");

        if (type === "channel" && !chTarget) return interaction.reply({ content: `${ERR} Failed execution: Missing explicit channel reference value.`, ephemeral: true });
        if (type === "role" && !rlTarget) return interaction.reply({ content: `${ERR} Failed execution: Missing explicit role reference value.`, ephemeral: true });

        const targetId = type === "channel" ? chTarget.id : rlTarget.id;
        const dbColumn = type === "channel" ? "excluded_channels" : "excluded_roles";
        let arrayList = JSON.parse(currentConfig[dbColumn] || "[]");

        if (action === "add") {
            if (arrayList.includes(targetId)) return interaction.reply({ content: `${ERR} Target configuration ID matches an existing whitelist slot context.`, ephemeral: true });
            arrayList.push(targetId);
        } else {
            if (!arrayList.includes(targetId)) return interaction.reply({ content: `${ERR} Request dropped: Target missing from active whitelists indices.`, ephemeral: true });
            arrayList = arrayList.filter(id => id !== targetId);
        }

        db.prepare(`UPDATE automod_config SET ${dbColumn} = ? WHERE guild_id = ?`).run(JSON.stringify(arrayList), guildId);
        return interaction.reply({ content: `${OK} **Exception Maps Reloaded.** Context identifier target <${type === "channel" ? "#" : "@&"}${targetId}> matrix rule altered successfully.`, ephemeral: true });
    }
}

export async function prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply(`${NO} Unauthorized Access.`);
    }

    const subcommand = args[0]?.toLowerCase();
    if (subcommand === "toggle") {
        const feature = args[1];
        const stateInput = args[2]?.toLowerCase();
        const state = ["on", "true", "enable", "enabled", "1"].includes(stateInput);
        if (!["slur_filter", "link_filter", "invite_filter", "spam_filter", "nsfw_filter"].includes(feature) || !stateInput) {
            return message.reply(`${ERR} Usage: \`KV$automod-config toggle <slur_filter|link_filter|invite_filter|spam_filter|nsfw_filter> <on|off>\``);
        }
        return execute(buildPrefixInteraction(message, {
            subcommand,
            values: { feature, state }
        }));
    }

    if (subcommand === "words") {
        const action = args[1]?.toLowerCase();
        const string = args.slice(2).join(" ").trim();
        if (!["add", "remove"].includes(action) || !string) {
            return message.reply(`${ERR} Usage: \`KV$automod-config words <add|remove> <word or phrase>\``);
        }
        return execute(buildPrefixInteraction(message, {
            subcommand,
            values: { action, string }
        }));
    }

    if (subcommand === "exclude") {
        const type = args[1]?.toLowerCase();
        const action = args[2]?.toLowerCase();
        const channel = type === "channel" ? resolveChannel(message, args[3]) : null;
        const role = type === "role" ? resolveRole(message, args[3]) : null;
        if (!["channel", "role"].includes(type) || !["add", "remove"].includes(action) || (!channel && !role)) {
            return message.reply(`${ERR} Usage: \`KV$automod-config exclude <channel|role> <add|remove> <#channel|@role>\``);
        }
        return execute(buildPrefixInteraction(message, {
            subcommand,
            values: { type, action, channel, role }
        }));
    }

    return message.reply(`${ERR} Usage: \`KV$automod-config <toggle|words|exclude> ...\``);
}

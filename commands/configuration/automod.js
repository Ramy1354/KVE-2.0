import { EmbedBuilder } from "discord.js";
import db from "../../database.js";

const UNAUTH = "<:KVE_Unauthorized:1516457478651510976>";

// Advanced baseline slur protection matching variations and common patterns
const SLUR_REGEX = /\b(slur1|slur2|badword|anotherword)\b|s[e3]l[u3]r/gi; 
const INVITE_REGEX = /(discord(?:\.(?:gg|io|me|li))|discord\.com\/invite)\/\S+/i;
const URL_REGEX = /https?:\/\/\S+/i;

export async function handleAutomod(message) {
    // 1. Structural Exceptions: Immediately bypass bots, DMs, or Server Administrators
    if (message.author.bot || !message.guild || message.member?.permissions.has("Administrator")) return false;

    // 2. Fetch server configuration array from SQLite
    let config = db.prepare("SELECT * FROM automod_config WHERE guild_id = ?").get(message.guild.id);
    if (!config) {
        config = { slur_filter: 1, link_filter: 1, invite_filter: 1, spam_filter: 1, nsfw_filter: 1, blocked_words: '[]', excluded_channels: '[]', excluded_roles: '[]' };
    }

    // 3. Evaluate Whitelists: Channel & Role exceptions
    const excludedChannels = JSON.parse(config.excluded_channels || '[]');
    const excludedRoles = JSON.parse(config.excluded_roles || '[]');
    
    if (excludedChannels.includes(message.channel.id)) return false;
    if (message.member.roles.cache.some(role => excludedRoles.includes(role.id))) return false;

    const messageContent = message.content || "";
    const contentLower = messageContent.toLowerCase();

    // 4. MODULE: Spam Detection (Threshold: 5 messages inside 3 seconds)
    if (config.spam_filter === 1) {
        const now = Date.now();
        
        // Fixed parameter counts to match schema parameters exactly
        db.prepare("INSERT OR IGNORE INTO automod_spam_monitor (user_id, guild_id, last_message_time, count) VALUES (?, ?, ?, 0)").run(message.author.id, message.guild.id, now);
        let userSpam = db.prepare("SELECT * FROM automod_spam_monitor WHERE user_id = ? AND guild_id = ?").get(message.author.id, message.guild.id);

        if (now - (userSpam.last_message_time || 0) < 3000) {
            const newCount = (userSpam.count || 0) + 1;
            db.prepare("UPDATE automod_spam_monitor SET count = ?, last_message_time = ? WHERE user_id = ? AND guild_id = ?").run(newCount, now, message.author.id, message.guild.id);
            if (newCount >= 5) {
                return await executeSanction(message, "Spam threshold triggered (Rapid messaging rules).");
            }
        } else {
            db.prepare("UPDATE automod_spam_monitor SET count = 1, last_message_time = ? WHERE user_id = ? AND guild_id = ?").run(now, message.author.id, message.guild.id);
        }
    }

    // 5. MODULE: Image Security (NSFW image block outside dedicated channels)
    if (config.nsfw_filter === 1 && message.attachments.size > 0) {
        const isImage = (att) => /\.(jpe?g|png|gif|webp|bmp|tiff)$/i.test(att.name || '') || (att.contentType && att.contentType.startsWith('image/'));
        const hasImage = message.attachments.some(att => isImage(att));
        
        if (hasImage && !message.channel?.nsfw) {
            return await executeSanction(message, "Media attachments are restricted outside designated NSFW channels.");
        }
    }

    // 6. MODULE: Discord Community Invites Filter
    if (config.invite_filter === 1 && INVITE_REGEX.test(messageContent)) {
        return await executeSanction(message, "Posting unauthorized server invite links.");
    }

    // 7. MODULE: Standard Web Links Filter
    if (config.link_filter === 1 && URL_REGEX.test(messageContent)) {
        // Safe check to avoid double alerting if it's already caught by the invite rule
        if (!INVITE_REGEX.test(messageContent)) {
            return await executeSanction(message, "External hyper-links or web URLs are restricted here.");
        }
    }

    // 8. MODULE: Core Slur Matcher
    if (config.slur_filter === 1 && SLUR_REGEX.test(messageContent)) {
        return await executeSanction(message, "Hate speech, baseline slurs, or highly hostile phrase match.");
    }

    // 9. MODULE: Custom Blocked Words Tracking Array
    const customBlockedList = JSON.parse(config.blocked_words || '[]');
    if (customBlockedList.some(word => contentLower.includes(word.toLowerCase()))) {
        return await executeSanction(message, "Message contains server-specific blocked word parameters.");
    }

    return false; // Clear, let message proceed
}

async function executeSanction(message, reasonText) {
    await message.delete().catch(() => {});
    
    const embed = new EmbedBuilder()
        .setColor("#EA2027")
        .setDescription(`${UNAUTH} **Automod Alert:** ${message.author}, your message was scrubbed.\n**Reason:** *${reasonText}*`);
        
    const notice = await message.channel.send({ embeds: [embed] });
    setTimeout(() => notice.delete().catch(() => {}), 5000);
    return true; 
}
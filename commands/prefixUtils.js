export function extractId(token) {
    return token?.match(/\d{16,25}/)?.[0] || null;
}

export async function resolveUser(message, token) {
    const id = extractId(token);
    if (!id) return null;
    return message.client.users.fetch(id).catch(() => null);
}

export async function resolveMember(message, token) {
    const id = extractId(token);
    if (!id || !message.guild) return null;
    return message.guild.members.fetch(id).catch(() => null);
}

export function resolveRole(message, token) {
    const id = extractId(token);
    if (!id || !message.guild) return null;
    return message.guild.roles.cache.get(id) || null;
}

export function resolveChannel(message, token) {
    const id = extractId(token);
    if (!id || !message.guild) return null;
    return message.guild.channels.cache.get(id) || null;
}

export function restReason(args, startIndex, fallback = "No reason provided") {
    return args.slice(startIndex).join(" ").trim() || fallback;
}

export function buildPrefixInteraction(message, options = {}) {
    const optionValues = options.values || {};
    let deferred = false;

    const getValue = (name) => optionValues[name] ?? null;
    const normalizeReply = (payload) => {
        if (!payload || typeof payload !== "object") return payload;

        const { ephemeral, flags, ...messagePayload } = payload;
        return messagePayload;
    };

    return {
        channel: message.channel,
        client: message.client,
        guild: message.guild,
        guildId: message.guild?.id,
        member: message.member,
        user: message.author,
        options: {
            getAttachment: getValue,
            getBoolean: getValue,
            getChannel: getValue,
            getInteger: getValue,
            getMentionable: getValue,
            getNumber: getValue,
            getRole: getValue,
            getString: getValue,
            getUser: getValue,
            getSubcommand: () => options.subcommand
        },
        async deferReply() {
            deferred = true;
        },
        async editReply(payload) {
            return message.reply(normalizeReply(payload));
        },
        async reply(payload) {
            return message.reply(normalizeReply(payload));
        },
        get deferred() {
            return deferred;
        },
        get replied() {
            return false;
        }
    };
}

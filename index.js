import { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import "dotenv/config";
import db from "./database.js";
import Groq from "groq-sdk";
import { handleAutomod } from "./commands/configuration/automod.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages 
    ],
    partials: [Partials.Channel] 
});

let groqClient = null;
if (process.env.GROQ_API_KEY) {
    try {
        groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    } catch (err) {
        console.error("Failed initializing GROQ client:", err);
    }
}

client.commands = new Collection();
const PREFIX = "KV$"; 

const ERR = '<:KVE_ERROR:1516460442149720184>';
const OK = '<:KVE_Approved:1516458503546339489>';

const commandsPath = path.join(__dirname, "commands");

async function loadCommands(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            await loadCommands(fullPath);
        } else if (file.endsWith(".js")) {
            const fileUrl = pathToFileURL(fullPath);
            const command = await import(fileUrl.href);
            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
            }
        }
    }
}

client.once("ready", async () => {
    console.log(`📡 Core matrix online. Logged in as ${client.user.tag}`);
    try {
        await loadCommands(commandsPath);
        console.log(`📥 Successfully mapped [${client.commands.size}] commands.`);

        await client.application.fetch();
        const slashCommands = Array.from(client.commands.values()).map(cmd => cmd.data?.toJSON ? cmd.data.toJSON() : cmd.data);
        if (slashCommands.length > 0) {
            await client.application.commands.set(slashCommands);
            console.log(`📤 Registered slash commands globally.`);
        }
    } catch (error) {
        console.error("Initialization failure:", error);
    }
});

client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
        console.log(`[Slash] ${interaction.user.tag} -> ${interaction.commandName}`);
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Execution crash at /${interaction.commandName}:`, error);
            const msgPayload = { content: `${ERR} Systems error executing command pipeline.`, flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(msgPayload);
            } else {
                await interaction.reply(msgPayload);
            }
        }
        return;
    }

    if (interaction.isButton()) {
        console.log(`[Button] ${interaction.user.tag} -> ${interaction.customId}`);
        const { customId, guild, user, channel } = interaction;

        if (customId === "verify_gate_trigger") {
            const verifySettings = db.prepare("SELECT * FROM verification_settings WHERE guild_id = ?").get(guild.id);
            if (!verifySettings || !verifySettings.role_id) {
                return interaction.reply({ content: `${ERR} Verification records unconfigured on the backend structure.`, flags: MessageFlags.Ephemeral });
            }

            const targetRole = guild.roles.cache.get(verifySettings.role_id);
            if (!targetRole || interaction.member.roles.cache.has(targetRole.id)) {
                return interaction.reply({ content: `ℹ️ Access checklist already confirmed or target deployment role is missing.`, flags: MessageFlags.Ephemeral });
            }

            let rawQuestion = "";
            let expectedAnswer = "";

            if (verifySettings.mode === "CAPTCHA") {
                const num1 = Math.floor(Math.random() * 12) + 2;
                const num2 = Math.floor(Math.random() * 11) + 2;
                rawQuestion = `Solve this equation captcha math challenge: **${num1} + ${num2}**`;
                expectedAnswer = String(num1 + num2);
            } else if (verifySettings.mode === "ALPHANUMERIC") {
                expectedAnswer = Math.random().toString(36).substring(2, 8).toUpperCase();
                rawQuestion = `Type this exact alphanumeric character combination case-sensitive: **${expectedAnswer}**`;
            } else {
                expectedAnswer = String(Math.floor(100000 + Math.random() * 900000));
                rawQuestion = `Type this exact authorization numeric digital security access code sequence: **${expectedAnswer}**`;
            }

            db.prepare(`
                INSERT INTO pending_verifications (user_id, guild_id, expected_code, timestamp)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id, guild_id) DO UPDATE SET expected_code = excluded.expected_code, timestamp = excluded.timestamp
            `).run(user.id, guild.id, expectedAnswer, Date.now());

            const setupEmbed = new EmbedBuilder()
                .setColor("#3498DB")
                .setTitle("🔒 Identity Challenge Verification Checkpoint")
                .setDescription(`Hello ${user}! You have generated a manual clearance checkpoint challenge assignment.\n\n${rawQuestion}\n\n*Reply with your answer in text format inside the next 5 minutes to verify.*`)
                .setFooter({ text: "Note: Verification inputs are case-sensitive." });

            if (verifySettings.use_dms === 1) {
                try {
                    await user.send({ embeds: [setupEmbed] });
                    return interaction.reply({ content: `📩 **Security dispatch delivered.** Check your Direct Messages (DMs) to complete authentication.`, flags: MessageFlags.Ephemeral });
                } catch (dmErr) {
                    return interaction.reply({ content: `${ERR} **Delivery Failed:** Ensure your private Direct Messages privacy profile toggles are opened to members of this server so I can send the code.`, flags: MessageFlags.Ephemeral });
                }
            } else {
                return interaction.reply({ embeds: [setupEmbed], flags: MessageFlags.Ephemeral });
            }
        }

        const settings = db.prepare("SELECT * FROM ticket_settings WHERE guild_id = ?").get(guild?.id);
        if (!settings && customId.startsWith("tt_")) {
            return interaction.reply({ content: `${ERR} Ticket database unconfigured. Run \`/setup-tickets\`.`, flags: MessageFlags.Ephemeral });
        }

        if (customId === "tt_open") {
            const blacklistCheck = db.prepare("SELECT * FROM ticket_blacklist WHERE user_id = ?").get(user.id);
            if (blacklistCheck) {
                return interaction.reply({ content: `${ERR} **Access Denied.** Blacklisted from tickets.\nReason: *${blacklistCheck.reason}*`, flags: MessageFlags.Ephemeral });
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const activeCheck = db.prepare("SELECT COUNT(*) as count FROM active_tickets WHERE guild_id = ? AND user_id = ? AND status = 'OPEN'").get(guild.id, user.id);
            if (activeCheck.count >= 3) {
                return interaction.editReply({ content: `${ERR} Denied. Maximum of 3 concurrent active tickets allowed.` });
            }

            const nextId = settings.ticket_count + 1;
            db.prepare("UPDATE ticket_settings SET ticket_count = ? WHERE guild_id = ?").run(nextId, guild.id);

            const padId = String(nextId).padStart(4, '0');
            const channelName = `ticket-${padId}`;

            try {
                const ticketChannel = await guild.channels.create({
                    name: channelName,
                    type: 0,
                    parent: settings.category_id,
                    permissionOverwrites: [
                        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
                        { id: settings.staff_role_id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] }
                    ]
                });

                db.prepare("INSERT INTO active_tickets (channel_id, guild_id, user_id) VALUES (?, ?, ?)")
                    .run(ticketChannel.id, guild.id, user.id);

                const controlEmbed = new EmbedBuilder()
                    .setColor("#2ECC71")
                    .setTitle(`🎫 Ticket Setup Cluster #${padId}`)
                    .setDescription(`Welcome <@${user.id}>. Support specialists have been paged.\nUse the control board buttons below to manage the ticket channel.`)
                    .addFields({ name: "👤 Opened By", value: `${user.tag}`, inline: true }, { name: "🔒 Write Lock", value: "Unlocked", inline: true });

                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("tt_close").setLabel("Close").setStyle(ButtonStyle.Danger).setEmoji("🔒"),
                    new ButtonBuilder().setCustomId("tt_claim").setLabel("Claim").setStyle(ButtonStyle.Success).setEmoji("🙋‍♂️"),
                    new ButtonBuilder().setCustomId("tt_unclaim").setLabel("Unclaim").setStyle(ButtonStyle.Secondary).setEmoji("🤷‍♂️").setDisabled(true)
                );

                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("tt_lock").setLabel("Lock User").setStyle(ButtonStyle.Secondary).setEmoji("🚫"),
                    new ButtonBuilder().setCustomId("tt_unlock").setLabel("Unlock User").setStyle(ButtonStyle.Secondary).setEmoji("🔓").setDisabled(true)
                );

                await ticketChannel.send({ content: `<@${user.id}> | <@&${settings.staff_role_id}>`, embeds: [controlEmbed], components: [row1, row2] });
                await interaction.editReply({ content: `${OK} Private station configured: <#${ticketChannel.id}>` });
            } catch (err) {
                console.error(err);
                await interaction.editReply({ content: `${ERR} Exception provisioning ticket channel assets.` });
            }
        }

        if (customId === "tt_close") {
            const ticketData = db.prepare("SELECT * FROM active_tickets WHERE channel_id = ?").get(channel.id);
            if (!ticketData) return;

            const isStaff = interaction.member.roles.cache.has(settings.staff_role_id) || interaction.member.permissions.has(PermissionFlagsBits.Administrator);
            if (!isStaff && interaction.user.id !== ticketData.user_id) {
                return interaction.reply({ content: `${ERR} Operational access locked. Clearances error.`, flags: MessageFlags.Ephemeral });
            }

            await interaction.reply({ content: "⏳ **Compiling transmission logs and generating chat transcript text profiles...**" });

            try {
                const fetchedMessages = await channel.messages.fetch({ limit: 100 });
                let transcriptText = `==================================================\nTICKET TOOL TRANSCRIPT ARCHIVE LOG: #${channel.name}\n==================================================\n\n`;

                Array.from(fetchedMessages.values()).reverse().forEach(msg => {
                    transcriptText += `[${msg.createdAt.toISOString()}] ${msg.author.tag}: ${msg.content}\n`;
                    if (msg.attachments.size > 0) {
                        msg.attachments.forEach(att => { transcriptText += ` >> FILE CAPTURE LOCATOR: ${att.url}\n`; });
                    }
                });

                const textBuffer = Buffer.from(transcriptText, "utf-8");
                const logEmbed = new EmbedBuilder()
                    .setColor("#34495E")
                    .setTitle(`📝 Archived Transcript Terminal: ${channel.name}`)
                    .addFields(
                        { name: "Owner Target ID", value: `<@${ticketData.user_id}>`, inline: true },
                        { name: "Closed By", value: `<@${user.id}>`, inline: true },
                        { name: "Claimed Assignment", value: ticketData.claimed_by ? `<@${ticketData.claimed_by}>` : "None Assigned", inline: true }
                    ).setTimestamp();

                const transcriptChannel = guild.channels.cache.get(settings.transcript_channel_id);
                if (transcriptChannel) {
                    const serverAttachment = new AttachmentBuilder(textBuffer, { name: `transcript-${channel.name}.txt` });
                    await transcriptChannel.send({ embeds: [logEmbed], files: [serverAttachment] }).catch(err => console.error("Failed writing log to server track channel:", err));
                }

                try {
                    const ticketOwner = await client.users.fetch(ticketData.user_id).catch(() => null);
                    if (ticketOwner) {
                        const dmAttachment = new AttachmentBuilder(textBuffer, { name: `your-transcript-${channel.name}.txt` });
                        const dmEmbed = EmbedBuilder.from(logEmbed)
                            .setColor("#2ECC71")
                            .setDescription(`Hello! This is a secure archived copy of your ticket conversation log session from **${guild.name}**.`);
                        
                        await ticketOwner.send({ embeds: [dmEmbed], files: [dmAttachment] });
                    }
                } catch (dmErr) {
                    console.log(`Could not dispatch transcript DM to user ${ticketData.user_id} because their DMs are locked.`);
                }

                db.prepare("DELETE FROM active_tickets WHERE channel_id = ?").run(channel.id);
                await interaction.followUp({ content: `💥 **Dual archival routes executed.** Erasing room structures in 3s...` });
                setTimeout(() => { channel.delete().catch(() => {}); }, 3000);
            } catch (err) {
                console.error("Transcript collection runtime failure:", err);
                await interaction.followUp({ content: `${ERR} Core execution handler crashed compiling outputs.` });
            }
        }

        if (customId === "tt_claim") {
            if (!interaction.member.roles.cache.has(settings.staff_role_id)) {
                return interaction.reply({ content: `${ERR} Staff role clearance matching rules rejected execution.`, flags: MessageFlags.Ephemeral });
            }

            db.prepare("UPDATE active_tickets SET claimed_by = ? WHERE channel_id = ?").run(user.id, channel.id);

            const r1 = ActionRowBuilder.from(interaction.message.components[0]);
            r1.components[1].setDisabled(true);
            r1.components[2].setDisabled(false);

            await interaction.update({ components: [r1, interaction.message.components[1]] });
            await channel.send({ content: `🙋‍♂️ **Support specialist <@${user.id}> has claimed exclusive ownership over this track.**` });
        }

        if (customId === "tt_unclaim") {
            const ticketData = db.prepare("SELECT * FROM active_tickets WHERE channel_id = ?").get(channel.id);
            if (ticketData?.claimed_by !== user.id) {
                return interaction.reply({ content: `${ERR} Conflict error: You do not currently hold this ticket's claim allocation.`, flags: MessageFlags.Ephemeral });
            }

            db.prepare("UPDATE active_tickets SET claimed_by = NULL WHERE channel_id = ?").run(channel.id);

            const r1 = ActionRowBuilder.from(interaction.message.components[0]);
            r1.components[1].setDisabled(false);
            r1.components[2].setDisabled(true);

            await interaction.update({ components: [r1, interaction.message.components[1]] });
            await channel.send({ content: `🤷‍♂️ **Ticket unclaimed.** Case returned to the active support pool.` });
        }

        if (customId === "tt_lock" || customId === "tt_unlock") {
            if (!interaction.member.roles.cache.has(settings.staff_role_id)) {
                return interaction.reply({ content: `${ERR} Support staff clearance verification failed.`, flags: MessageFlags.Ephemeral });
            }

            const ticketData = db.prepare("SELECT * FROM active_tickets WHERE channel_id = ?").get(channel.id);
            if (!ticketData) return;

            const executeLock = customId === "tt_lock";

            try {
                await channel.permissionOverwrites.edit(ticketData.user_id, { SendMessages: !executeLock });

                const r2 = ActionRowBuilder.from(interaction.message.components[1]);
                r2.components[0].setDisabled(executeLock);
                r2.components[1].setDisabled(!executeLock);

                await interaction.update({ components: [interaction.message.components[0], r2] });
                await channel.send({ content: executeLock 
                    ? `🚫 <@${ticketData.user_id}>'s writing permissions have been **revoked**. Channel swapped to Read-Only.` 
                    : `🔓 <@${ticketData.user_id}>'s active communications capabilities have been **restored**.` 
                });
            } catch (err) {
                await interaction.reply({ content: `${ERR} Failed processing API overwrite matrix parameters toggles.`, flags: MessageFlags.Ephemeral });
            }
        }
    }
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith(PREFIX)) {
        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = client.commands.get(commandName);

        if (command && command.prefixExecute) {
            try {
                console.log(`[Prefix] ${message.author.tag} -> ${commandName}`);
                await command.prefixExecute(message, args);
                return; 
            } catch (error) {
                console.error(`Prefix command failure on ${PREFIX}${commandName}:`, error);
                return await message.reply(`${ERR} Runtime processing error inside the command loop.`);
            }
        }
    }

    const isInterrupted = await handleAutomod(message);
    if (isInterrupted) return; 

    const targetGuildId = message.guild ? message.guild.id : null;
    let pendingMatch = null;

    if (targetGuildId) {
        pendingMatch = db.prepare("SELECT * FROM pending_verifications WHERE user_id = ? AND guild_id = ?").get(message.author.id, targetGuildId);
    } else {
        pendingMatch = db.prepare("SELECT * FROM pending_verifications WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1").get(message.author.id);
    }

    if (pendingMatch && (Date.now() - pendingMatch.timestamp) < 300000) { 
        const cleanContent = message.content.trim();

        if (cleanContent === pendingMatch.expected_code) {
            const associatedGuild = client.guilds.cache.get(pendingMatch.guild_id);
            const verifySettings = db.prepare("SELECT * FROM verification_settings WHERE guild_id = ?").get(pendingMatch.guild_id);
            
            if (associatedGuild && verifySettings) {
                try {
                    const memberInstance = await associatedGuild.members.fetch(message.author.id).catch(() => null);
                    const targetRole = associatedGuild.roles.cache.get(verifySettings.role_id);
                    const unverifiedRole = verifySettings.unverified_role_id ? associatedGuild.roles.cache.get(verifySettings.unverified_role_id) : null;
                    
                    if (memberInstance && targetRole) {
                        await memberInstance.roles.add(targetRole);
                        if (unverifiedRole && memberInstance.roles.cache.has(unverifiedRole.id)) {
                            await memberInstance.roles.remove(unverifiedRole);
                        }

                        db.prepare("DELETE FROM pending_verifications WHERE user_id = ? AND guild_id = ?").run(message.author.id, pendingMatch.guild_id);
                        
                        if (message.guild) message.delete().catch(() => {});
                        await message.author.send(`✅ **Verification Confirmed!** You have been fully authorized inside **${associatedGuild.name}**. Enjoy your stay!`).catch(() => {});
                        return;
                    }
                } catch (apiErr) {
                    console.error("Verification role mutation routine failure:", apiErr);
                }
            }
        } else {
            if (message.guild) {
                message.delete().catch(() => {});
                const warningMsg = await message.channel.send({ content: `❌ **Wrong authentication answer.** Click the button again to try a new challenge sequence, <@${message.author.id}>.` });
                setTimeout(() => warningMsg.delete().catch(() => {}), 4000);
                return;
            } else {
                await message.reply("❌ **Invalid verification answer sequence.** Please return to the server gateway page and click the verification panel trigger to try a new run pattern.");
                return;
            }
        }
    }

    if (!message.guild) {
        console.log(`[DM Received] ${message.author.tag}: ${message.content}`);

        if (groqClient) {
            await message.channel.sendTyping();
            try {
                const completion = await groqClient.chat.completions.create({
                    messages: [
                        { role: 'system', content: 'You are Gemini, an authentic, adaptive AI collaborator with a touch of wit responding privately inside Direct Messages.' },
                        { role: 'user', content: message.content }
                    ],
                    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
                });
                return await message.reply({ content: completion.choices[0].message.content });
            } catch (err) {
                console.error("DM AI routine processing crash:", err);
            }
        }
        return;
    }

    try {
        if (message.mentions && message.mentions.has && message.mentions.has(client.user)) {
            const content = message.content.replace(/<@!?(\d+)>/g, "").trim();
            if (!content) return;

            if (!groqClient) {
                return message.reply({ content: `${ERR} AI engine unavailable.`, allowedMentions: { repliedUser: false } });
            }

            console.log(`[Mention] ${message.author.tag} -> ${content}`);
            await message.channel.sendTyping();
            
            try {
                const completion = await groqClient.chat.completions.create({
                    messages: [
                        { role: 'system', content: 'You are Gemini, an authentic, adaptive AI collaborator with a touch of wit.' },
                        { role: 'user', content }
                    ],
                    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
                });
                
                const aiText = completion?.choices?.[0]?.message?.content;
                if (!aiText) return message.reply({ content: `${ERR} AI output generated an empty profile structure.`, allowedMentions: { repliedUser: false } });

                return message.reply({ content: aiText, allowedMentions: { repliedUser: false } });
            } catch (err) {
                console.error('Error calling GROQ chat completion:', err);
                return message.reply({ content: `${ERR} AI request failed.`, allowedMentions: { repliedUser: false } });
            }
        }
    } catch (err) {
        console.error('Mention handler error:', err);
    }
});

client.on("guildMemberAdd", async (member) => {
    const verifySettings = db.prepare("SELECT * FROM verification_settings WHERE guild_id = ?").get(member.guild.id);
    if (verifySettings && verifySettings.unverified_role_id) {
        const unverifiedRole = member.guild.roles.cache.get(verifySettings.unverified_role_id);
        if (unverifiedRole) {
            await member.roles.add(unverifiedRole).catch(() => console.error("Auto-role injection blocked by rank hierarchy order setup."));
        }
    }

    const settings = db.prepare("SELECT * FROM welcome_settings WHERE guild_id = ?").get(member.guild.id);
    if (!settings || !settings.welcome_channel_id) return;

    const channel = member.guild.channels.cache.get(settings.welcome_channel_id);
    if (!channel) return;

    const parsePlaceholders = (text) => {
        if (!text) return "";
        return text.replace(/{user}/g, `${member.user}`)
                   .replace(/{username}/g, member.user.username)
                   .replace(/{server}/g, member.guild.name)
                   .replace(/{count}/g, member.guild.memberCount);
    };

    const welcomeEmbed = new EmbedBuilder()
        .setColor(settings.welcome_color || "#2ECC71")
        .setTitle(`👋 Welcome to ${member.guild.name}!`)
        .setDescription(parsePlaceholders(settings.welcome_message));

    if (settings.welcome_thumbnail === "avatar") {
        welcomeEmbed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
    } else if (settings.welcome_thumbnail) {
        welcomeEmbed.setThumbnail(settings.welcome_thumbnail);
    }

    if (settings.welcome_image) {
        welcomeEmbed.setImage(settings.welcome_image);
    }

    if (settings.welcome_footer) {
        welcomeEmbed.setFooter({ text: parsePlaceholders(settings.welcome_footer) });
    } else {
        welcomeEmbed.setFooter({ text: `Member Count: #${member.guild.memberCount}` });
    }

    welcomeEmbed.setTimestamp();
    await channel.send({ content: `${member}`, embeds: [welcomeEmbed] }).catch(() => {});
});

client.on("guildMemberRemove", async (member) => {
    const settings = db.prepare("SELECT * FROM welcome_settings WHERE guild_id = ?").get(member.guild.id);
    if (!settings || !settings.goodbye_channel_id) return;

    const channel = member.guild.channels.cache.get(settings.goodbye_channel_id);
    if (!channel) return;

    const parsePlaceholders = (text) => {
        if (!text) return "";
        return text.replace(/{user}/g, `**${member.user.username}**`)
                   .replace(/{username}/g, member.user.username)
                   .replace(/{server}/g, member.guild.name)
                   .replace(/{count}/g, member.guild.memberCount);
    };

    const goodbyeEmbed = new EmbedBuilder()
        .setColor(settings.goodbye_color || "#E74C3C")
        .setTitle(`😢 Member Departed`)
        .setDescription(parsePlaceholders(settings.goodbye_message));

    if (settings.goodbye_thumbnail === "avatar") {
        goodbyeEmbed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
    } else if (settings.goodbye_thumbnail) {
        goodbyeEmbed.setThumbnail(settings.goodbye_thumbnail);
    }

    if (settings.goodbye_image) {
        goodbyeEmbed.setImage(settings.goodbye_image);
    }

    if (settings.goodbye_footer) {
        goodbyeEmbed.setFooter({ text: parsePlaceholders(settings.goodbye_footer) });
    } else {
        goodbyeEmbed.setFooter({ text: `Updated Member Pool: ${member.guild.memberCount}` });
    }

    goodbyeEmbed.setTimestamp();
    await channel.send({ embeds: [goodbyeEmbed] }).catch(() => {});
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
});

client.login(process.env.TOKEN || process.env.DISCORD_TOKEN);
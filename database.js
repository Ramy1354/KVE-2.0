import Database from 'better-sqlite3';
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initializing the unified server data matrix file
const db = new Database(path.join(__dirname, 'tickets.db'));

// =========================================================================
// 🎫 TICKETING SYSTEM CORE MATRIX
// =========================================================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS ticket_settings (
        guild_id TEXT PRIMARY KEY,
        category_id TEXT,
        staff_role_id TEXT,
        panel_channel_id TEXT,
        transcript_channel_id TEXT,
        ticket_count INTEGER DEFAULT 0
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS active_tickets (
        channel_id TEXT PRIMARY KEY,
        guild_id TEXT,
        user_id TEXT,
        status TEXT DEFAULT 'OPEN',
        claimed_by TEXT
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS ticket_blacklist (
        user_id TEXT PRIMARY KEY,
        blacklisted_by TEXT,
        reason TEXT
    )
`).run();

// =========================================================================
// 🛡️ ADVANCED AUTOMOD PROTOCOL SECURITY LAYER
// =========================================================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS automod_config (
        guild_id TEXT PRIMARY KEY,
        slur_filter INTEGER DEFAULT 1,
        link_filter INTEGER DEFAULT 1,
        invite_filter INTEGER DEFAULT 1,
        spam_filter INTEGER DEFAULT 1,
        nsfw_filter INTEGER DEFAULT 1,
        blocked_words TEXT DEFAULT '[]',
        excluded_channels TEXT DEFAULT '[]',
        excluded_roles TEXT DEFAULT '[]'
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS automod_spam_monitor (
        user_id TEXT,
        guild_id TEXT,
        last_message_time INTEGER,
        count INTEGER,
        PRIMARY KEY(user_id, guild_id)
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS user_warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        user_id TEXT,
        moderator_id TEXT,
        reason TEXT,
        timestamp INTEGER
    )
`).run();

// =========================================================================
// 👋 LOGISTICS COMMUNICATIONS LAYER (WELCOME / DEPARTURES)
// =========================================================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS welcome_settings (
        guild_id TEXT PRIMARY KEY,
        welcome_channel_id TEXT DEFAULT NULL,
        goodbye_channel_id TEXT DEFAULT NULL,
        welcome_message TEXT DEFAULT "Welcome {user} to the server!",
        goodbye_message TEXT DEFAULT "{user} has left the server.",
        welcome_image TEXT DEFAULT NULL,
        goodbye_image TEXT DEFAULT NULL,
        welcome_thumbnail TEXT DEFAULT NULL,
        goodbye_thumbnail TEXT DEFAULT NULL,
        welcome_footer TEXT DEFAULT NULL,
        goodbye_footer TEXT DEFAULT NULL,
        welcome_color TEXT DEFAULT "#2ECC71",
        goodbye_color TEXT DEFAULT "#E74C3C"
    )
`).run();

// =========================================================================
// 🔒 GATEWAY IDENTITY CHALLENGE VERIFICATION LAYER
// =========================================================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS verification_settings (
        guild_id TEXT PRIMARY KEY,
        role_id TEXT DEFAULT NULL,
        channel_id TEXT DEFAULT NULL,
        mode TEXT DEFAULT "NUMBERS",
        use_dms INTEGER DEFAULT 0,
        unverified_role_id TEXT DEFAULT NULL
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS pending_verifications (
        user_id TEXT,
        guild_id TEXT,
        expected_code TEXT,
        timestamp INTEGER,
        PRIMARY KEY (user_id, guild_id)
    )
`).run();

// =========================================================================
// 📁 MASTER LIVE DATABASE COLD-PATCH SCHEMA MIGRATIONS
// =========================================================================

const masterMigrationMatrix = [
    {
        table: "verification_settings",
        columns: [
            { name: "unverified_role_id", type: "TEXT DEFAULT NULL" }
        ]
    },
    {
        table: "welcome_settings",
        columns: [
            { name: "welcome_image", type: "TEXT DEFAULT NULL" },
            { name: "goodbye_image", type: "TEXT DEFAULT NULL" },
            { name: "welcome_thumbnail", type: "TEXT DEFAULT NULL" },
            { name: "goodbye_thumbnail", type: "TEXT DEFAULT NULL" },
            { name: "welcome_footer", type: "TEXT DEFAULT NULL" },
            { name: "goodbye_footer", type: "TEXT DEFAULT NULL" },
            { name: "welcome_color", type: "TEXT DEFAULT '#2ECC71'" },
            { name: "goodbye_color", type: "TEXT DEFAULT '#E74C3C'" }
        ]
    },
    {
        table: "ticket_settings",
        columns: [
            { name: "panel_channel_id", type: "TEXT DEFAULT NULL" }
        ]
    },
    {
        table: "automod_config",
        columns: [
            { name: "slur_filter", type: "INTEGER DEFAULT 1" },
            { name: "link_filter", type: "INTEGER DEFAULT 1" },
            { name: "invite_filter", type: "INTEGER DEFAULT 1" },
            { name: "spam_filter", type: "INTEGER DEFAULT 1" },
            { name: "nsfw_filter", type: "INTEGER DEFAULT 1" },
            { name: "blocked_words", type: "TEXT DEFAULT '[]'" },
            { name: "excluded_channels", type: "TEXT DEFAULT '[]'" },
            { name: "excluded_roles", type: "TEXT DEFAULT '[]'" }
        ]
    }
];

// Run the master check sequence across all configurations
console.log("⚙️ Initializing Master Database Integration Check...");

masterMigrationMatrix.forEach(target => {
    target.columns.forEach(column => {
        try {
            db.prepare(`ALTER TABLE ${target.table} ADD COLUMN ${column.name} ${column.type}`).run();
            console.log(`📁 Patched Missing Asset: [${target.table} -> ${column.name}] successfully injected.`);
        } catch (err) {
            // Error is thrown if column already exists on disk, safely catch and ignore
        }
    });
});

console.log("✅ Master Database Integration verified and running fully up-to-date!");

export default db;
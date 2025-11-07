import path from 'node:path';
import { app } from 'electron';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import crypto from 'node:crypto';

export interface User {
    id: number;
    name: string;
    apiKeys: string[];
    avatar?: string | null; // legacy base64 (will be phased out)
    avatar_path?: string | null; // filesystem storage path
    avatar_hash?: string | null; // content hash for cache busting / dedupe
    created_at?: string;
    updated_at?: string;
}

export interface APIKeyRecord {
    id: number;
    platform: PlatformRecord;
    client_id?: string;
    key: string;
    created_at?: string;
    updated_at?: string;
}

export interface PlatformRecord {
    id: number;
    name: string;
    created_at?: string;
    updated_at?: string;
}

export interface GameRecord {
    id: number;
    appid?: number;
    title: string;
    platform: PlatformRecord; // normalized join
    platform_id?: number; // internal for updates
    genre: string;
    tags?: string[];
    release_date?: string | null;
    playtime_minutes?: number | null;
    rtime_last_played?: string | null;
    created_at?: string;
    updated_at?: string;
    installed_path?: string | null;
    application_file?: string | null;
}

export interface CollectionRecord {
    id: number;
    name: string;
    games?: GameRecord[];
    created_at?: string;
    updated_at?: string;
}

let db: any | null = null; // Using any due to ambient module declaration; for stronger typing install @types/better-sqlite3

export function initDatabase() {
    if (db) return db;
    const userData = app.getPath('userData');
    const file = path.join(userData, 'arcana.db');
    db = new Database(file);
    db.pragma('journal_mode = WAL');
    migrate();
    return db;
}

export function getDatabaseFilePath(): string {
    // Even if not initialized yet, derive path deterministically.
    const userData = app.getPath('userData');
    return path.join(userData, 'arcana.db');
}

function migrate() {
    if (!db) return;
    db.prepare(`CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`).run();
    // Add avatar-related columns if missing (non-destructive schema evolution)
    try {
        const cols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
        if (!cols.some(c => c.name === 'avatar')) {
            db.prepare('ALTER TABLE users ADD COLUMN avatar TEXT').run();
        }
        if (!cols.some(c => c.name === 'avatar_path')) {
            db.prepare('ALTER TABLE users ADD COLUMN avatar_path TEXT').run();
        }
        if (!cols.some(c => c.name === 'avatar_hash')) {
            db.prepare('ALTER TABLE users ADD COLUMN avatar_hash TEXT').run();
        }
    } catch (e) {
        console.warn('[migrate] avatar columns check failed', e);
    }
    db.prepare(`CREATE TABLE IF NOT EXISTS platforms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        appid INTEGER,
        title TEXT NOT NULL,
        platform_id INTEGER NOT NULL REFERENCES platforms(id) ON DELETE RESTRICT,
        genre TEXT NOT NULL,
        tags TEXT,
        release_date TEXT,
        playtime_minutes INTEGER,
        rtime_last_played TEXT,
        installed_path TEXT,
        application_file TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS collection_games (
        collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
        game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        PRIMARY KEY (collection_id, game_id)
    );`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform_id INTEGER NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
        client_id TEXT,
        key TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, platform_id, client_id)
    );`).run();
    // meta keys: active_user_id, schema_version
    db.prepare(`INSERT OR IGNORE INTO _meta (key, value) VALUES ('schema_version','1')`).run();
}

function ensurePlatform(name: string): PlatformRecord {
    const existing = db!.prepare('SELECT * FROM platforms WHERE name = ?').get(name) as PlatformRecord | undefined;
    if (existing) return existing;
    const info = db!.prepare('INSERT INTO platforms (name) VALUES (?)').run(name);
    return db!.prepare('SELECT * FROM platforms WHERE id = ?').get(info.lastInsertRowid) as PlatformRecord;
}

function ensureUser(name: string): User {
    const existing = db!.prepare('SELECT * FROM users WHERE name = ?').get(name) as User | undefined;
    if (existing) return existing;
    const info = db!.prepare('INSERT INTO users (name) VALUES (?)').run(name);
    return db!.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid) as User;
}

function rowToApiKey(row: any): APIKeyRecord {
    const platform = db!.prepare('SELECT * FROM platforms WHERE id = ?').get(row.platform_id) as PlatformRecord;
    return {
        id: row.id,
        platform,
        client_id: row.client_id ?? undefined,
        key: row.key,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function getMeta(key: string): string | null {
    initDatabase();
    const row = db!.prepare('SELECT value FROM _meta WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
}

export function setMeta(key: string, value: string) {
    initDatabase();
    db!.prepare('INSERT INTO _meta (key,value) VALUES (@key,@value) ON CONFLICT(key) DO UPDATE SET value=@value').run({ key, value });
}

export function setActiveUser(id: number) {
    setMeta('active_user_id', String(id));
}

export function getActiveUser(): User | null {
    const id = getMeta('active_user_id');
    if (!id) return null;
    initDatabase();
    return db!.prepare('SELECT * FROM users WHERE id = ?').get(Number(id)) as User | null;
}

export function listPlatforms(): PlatformRecord[] {
    initDatabase();
    return db!.prepare('SELECT * FROM platforms ORDER BY name').all() as PlatformRecord[];
}

export function seedPlatforms(names: string[]) {
    initDatabase();
    const insert = db!.prepare('INSERT OR IGNORE INTO platforms (name) VALUES (?)');
    const tx = db!.transaction((arr: string[]) => { for (const n of arr) insert.run(n); });
    tx(names);
}

function rowToGame(row: any): GameRecord {
    const platform = db!.prepare('SELECT * FROM platforms WHERE id = ?').get(row.platform_id) as PlatformRecord;
    return {
        id: row.id,
        appid: row.appid ?? undefined,
        title: row.title,
        platform,
        platform_id: row.platform_id,
        genre: row.genre,
        tags: row.tags ? JSON.parse(row.tags) : [],
        release_date: row.release_date ?? null,
        playtime_minutes: row.playtime_minutes ?? null,
        rtime_last_played: row.rtime_last_played ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        installed_path: row.installed_path ?? null,
        application_file: row.application_file ?? null,
    };
}

export function listGames(): GameRecord[] {
    initDatabase();
    const rows = db!.prepare('SELECT * FROM games ORDER BY title ASC').all();
    return rows.map(rowToGame);
}

export function insertGame(game: Partial<GameRecord> & { platform: PlatformRecord | string }) : GameRecord {
    initDatabase();
    const plat = typeof game.platform === 'string' ? ensurePlatform(game.platform) : ensurePlatform(game.platform.name);
    const tagsString = game.tags ? JSON.stringify(game.tags) : null;
    const stmt = db!.prepare(`INSERT INTO games (appid,title, platform_id, genre, tags, release_date, playtime_minutes, rtime_last_played, installed_path, application_file) 
        VALUES (@appid,@title,@platform_id,@genre,@tags,@release_date,@playtime_minutes,@rtime_last_played,@installed_path,@application_file)`);
    const info = stmt.run({
        appid: game.appid ?? null,
        title: game.title,
        platform_id: plat.id,
        genre: game.genre,
        tags: tagsString,
        release_date: game.release_date ?? null,
        playtime_minutes: game.playtime_minutes ?? null,
        rtime_last_played: game.rtime_last_played ?? null,
        installed_path: game.installed_path ?? null,
        application_file: game.application_file ?? null,
    });
    const row = db!.prepare('SELECT * FROM games WHERE id = ?').get(info.lastInsertRowid);
    return rowToGame(row);
}

export function updateGame(game: Partial<GameRecord> & { id: number; platform?: PlatformRecord | string }): GameRecord {
    initDatabase();
    const existing = db!.prepare('SELECT * FROM games WHERE id = ?').get(game.id);
    if (!existing) throw new Error('Game not found');
    const plat = game.platform ? (typeof game.platform === 'string' ? ensurePlatform(game.platform) : ensurePlatform(game.platform.name)) : db!.prepare('SELECT * FROM platforms WHERE id = ?').get(existing.platform_id) as PlatformRecord;
    const tagsString = game.tags ? JSON.stringify(game.tags) : existing.tags;
    db!.prepare(`UPDATE games SET 
        appid=@appid,
        title=@title,
        platform_id=@platform_id,
        genre=@genre,
        tags=@tags,
        release_date=@release_date,
        playtime_minutes=@playtime_minutes,
        rtime_last_played=@rtime_last_played,
        installed_path=@installed_path,
        application_file=@application_file,
        updated_at=datetime('now')
        WHERE id=@id`).run({
            id: game.id,
            appid: game.appid ?? existing.appid ?? null,
            title: game.title ?? existing.title,
            platform_id: plat.id,
            genre: game.genre ?? existing.genre,
            tags: tagsString,
            release_date: game.release_date ?? existing.release_date ?? null,
            playtime_minutes: game.playtime_minutes ?? existing.playtime_minutes ?? null,
            rtime_last_played: game.rtime_last_played ?? existing.rtime_last_played ?? null,
            installed_path: game.installed_path ?? existing.installed_path ?? null,
            application_file: game.application_file ?? existing.application_file ?? null,
        });
    const row = db!.prepare('SELECT * FROM games WHERE id = ?').get(game.id);
    return rowToGame(row);
}

export function deleteGame(id: number): void {
    initDatabase();
    db!.prepare('DELETE FROM games WHERE id = ?').run(id);
}

export function listDistinct(column: 'platform' | 'genre'): string[] {
    initDatabase();
    if (column === 'platform') {
        const rows = db!.prepare('SELECT name as value FROM platforms ORDER BY name').all() as { value: string }[];
        return rows.map(r => r.value);
    }
    const rows = db!.prepare('SELECT DISTINCT genre as value FROM games ORDER BY genre').all() as { value: string }[];
    return rows.map(r => r.value);
}

export function listCollections(): CollectionRecord[] {
    initDatabase();
    const collections = db!.prepare('SELECT * FROM collections ORDER BY name').all();
    return collections.map((c: any) => ({ id: c.id, name: c.name, created_at: c.created_at, updated_at: c.updated_at }));
}

export function getCollectionWithGames(id: number): CollectionRecord | null {
    initDatabase();
    const c = db!.prepare('SELECT * FROM collections WHERE id = ?').get(id);
    if (!c) return null;
    const gameRows = db!.prepare(`SELECT g.* FROM games g
        INNER JOIN collection_games cg ON cg.game_id = g.id
        WHERE cg.collection_id = ? ORDER BY g.title`).all(id);
    return { id: c.id, name: c.name, created_at: c.created_at, updated_at: c.updated_at, games: gameRows.map(rowToGame) };
}

export function createCollection(name: string): CollectionRecord {
    initDatabase();
    const info = db!.prepare('INSERT INTO collections (name) VALUES (?)').run(name);
    return db!.prepare('SELECT * FROM collections WHERE id = ?').get(info.lastInsertRowid) as CollectionRecord;
}

export function addGameToCollection(collectionId: number, gameId: number) {
    initDatabase();
    db!.prepare('INSERT OR IGNORE INTO collection_games (collection_id, game_id) VALUES (?, ?)').run(collectionId, gameId);
}

export function removeGameFromCollection(collectionId: number, gameId: number) {
    initDatabase();
    db!.prepare('DELETE FROM collection_games WHERE collection_id = ? AND game_id = ?').run(collectionId, gameId);
}

// ---- Users ----
export function listUsers(): User[] {
    initDatabase();
    return db!.prepare('SELECT * FROM users ORDER BY name').all() as User[];
}

export function createUser(name: string): User {
    initDatabase();
    return ensureUser(name);
}

export function deleteUser(id: number) {
    initDatabase();
    db!.prepare('DELETE FROM users WHERE id = ?').run(id);
}

// ---- User Avatar ----
export function updateUserAvatar(id: number, avatar: string | null): User {
    initDatabase();
    const existing = db!.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    if (!existing) throw new Error('User not found');
    db!.prepare("UPDATE users SET avatar=@avatar, updated_at=datetime('now') WHERE id=@id").run({ id, avatar });
    return db!.prepare('SELECT * FROM users WHERE id = ?').get(id) as User;
}

// File-based avatar storage (preferred). Provide a data URL; image written to disk and path/hash persisted.
export function updateUserAvatarFile(id: number, dataUrl: string | null): User {
    initDatabase();
    const existing = db!.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    if (!existing) throw new Error('User not found');
    if (!dataUrl) {
    db!.prepare("UPDATE users SET avatar_path=NULL, avatar_hash=NULL, updated_at=datetime('now') WHERE id=@id").run({ id });
        return db!.prepare('SELECT * FROM users WHERE id = ?').get(id) as User;
    }
    const match = /^data:(image\/[^;]+);base64,(.+)$/.exec(dataUrl);
    if (!match) throw new Error('Invalid image data URL');
    const mime = match[1];
    const base64 = match[2];
    const buf = Buffer.from(base64, 'base64');
    const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
    const ext = mime.includes('png') ? 'png' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'bin';
    const userData = app.getPath('userData');
    const dir = path.join(userData, 'avatars');
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    const filename = `u${id}-${hash}.${ext}`;
    const fullPath = path.join(dir, filename);
    fs.writeFileSync(fullPath, buf);
    db!.prepare("UPDATE users SET avatar_path=@avatar_path, avatar_hash=@avatar_hash, updated_at=datetime('now') WHERE id=@id").run({ id, avatar_path: fullPath, avatar_hash: hash });
    return db!.prepare('SELECT * FROM users WHERE id = ?').get(id) as User;
}

// Return avatar as data URL (file-based preferred, fallback to legacy base64 column)
export function getUserAvatarData(id: number): string | null {
    initDatabase();
    const row = db!.prepare('SELECT avatar_path, avatar FROM users WHERE id = ?').get(id) as { avatar_path?: string | null; avatar?: string | null } | undefined;
    if (!row) return null;
    if (row.avatar_path) {
        try {
            const buf = fs.readFileSync(row.avatar_path);
            const ext = path.extname(row.avatar_path).slice(1).toLowerCase();
            const mime = ext === 'png' ? 'image/png' : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'application/octet-stream';
            return `data:${mime};base64,${buf.toString('base64')}`;
        } catch (e) {
            console.warn('[avatar] failed to read file', e);
        }
    }
    return row.avatar ?? null;
}

// ---- API Keys ----
export function listApiKeys(userId?: number): APIKeyRecord[] {
    initDatabase();
    const rows: any[] = userId
        ? db!.prepare('SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC').all(userId)
        : db!.prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all();
    return rows.map(rowToApiKey);
}

export function createApiKey(params: { user: string | number; platform: string | PlatformRecord; key: string; client_id?: string }) : APIKeyRecord {
    initDatabase();
    const user = typeof params.user === 'string' ? ensureUser(params.user) : db!.prepare('SELECT * FROM users WHERE id = ?').get(params.user) as User;
    if (!user) throw new Error('User not found');
    const platform = typeof params.platform === 'string' ? ensurePlatform(params.platform) : ensurePlatform(params.platform.name);
    const info = db!.prepare(`INSERT INTO api_keys (user_id, platform_id, client_id, key) VALUES (@user_id,@platform_id,@client_id,@key)`).run({
        user_id: user.id,
        platform_id: platform.id,
        client_id: params.client_id ?? null,
        key: params.key,
    });
    const row = db!.prepare('SELECT * FROM api_keys WHERE id = ?').get(info.lastInsertRowid);
    return rowToApiKey(row);
}

export function updateApiKey(params: { id: number; key?: string; client_id?: string }) : APIKeyRecord {
    initDatabase();
    const existing = db!.prepare('SELECT * FROM api_keys WHERE id = ?').get(params.id);
    if (!existing) throw new Error('API key not found');
    db!.prepare("UPDATE api_keys SET key = COALESCE(@key,key), client_id = COALESCE(@client_id, client_id), updated_at = datetime('now') WHERE id = @id").run({
        id: params.id,
        key: params.key ?? existing.key,
        client_id: params.client_id ?? existing.client_id,
    });
    const row = db!.prepare('SELECT * FROM api_keys WHERE id = ?').get(params.id);
    return rowToApiKey(row);
}

export function deleteApiKey(id: number) {
    initDatabase();
    db!.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
}

export function seedIfEmpty() {
    initDatabase();
    const gameCount = db!.prepare('SELECT COUNT(*) as c FROM games').get() as { c: number };
    if (gameCount.c === 0) {
        const demo = [
            { title: 'The Witcher 3', platform: 'Steam', genre: 'RPG', tags: ['open-world','story'] },
            { title: 'God of War', platform: 'Steam', genre: 'Action', tags: ['story','combat'] },
            { title: 'Halo Infinite', platform: 'Steam', genre: 'FPS', tags: ['shooter'] },
            { title: 'Cyberpunk 2077', platform: 'Steam', genre: 'RPG', tags: ['open-world','sci-fi'] },
        ];
        const insertMany = db!.transaction((arr: any[]) => { for (const g of arr) insertGame(g); });
        insertMany(demo);
    }
    const collCount = db!.prepare('SELECT COUNT(*) as c FROM collections').get() as { c: number };
    if (collCount.c === 0) {
        const fav = createCollection('Favorites');
        const rpg = createCollection('RPG Picks');
        // Add some games to collections
        const all = listGames();
        for (const g of all) {
            if (g.genre === 'RPG') addGameToCollection(rpg.id, g.id);
            if (g.title.includes('Witcher') || g.title.includes('Cyberpunk')) addGameToCollection(fav.id, g.id);
        }
    }
}

export function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}

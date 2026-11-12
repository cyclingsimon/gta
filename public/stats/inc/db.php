<?php
// Datenbank der Spielstatistik (SQLite). Schema wird beim ersten Zugriff angelegt (idempotent).
declare(strict_types=1);
require_once __DIR__ . '/../config.php';

function db(): PDO {
    static $db = null;
    if ($db) return $db;
    $dir = dirname(DB_PATH);
    if (!is_dir($dir)) mkdir($dir, 0775, true);
    $db = new PDO('sqlite:' . DB_PATH, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');
    $db->exec('CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY, device TEXT NOT NULL, started INTEGER NOT NULL, last INTEGER NOT NULL,
        version TEXT, region TEXT, quality TEXT, mobile INTEGER DEFAULT 0, screen TEXT, lang TEXT,
        active_s REAL DEFAULT 0, dist_m REAL DEFAULT 0, max_kmh REAL DEFAULT 0, siren_s REAL DEFAULT 0,
        horns INTEGER DEFAULT 0, boings INTEGER DEFAULT 0, hearts INTEGER DEFAULT 0,
        m_accept INTEGER DEFAULT 0, m_done INTEGER DEFAULT 0, stars INTEGER DEFAULT 0, players INTEGER DEFAULT 1,
        region_switches INTEGER DEFAULT 0, splashes INTEGER DEFAULT 0
    )');
    $db->exec('CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT NOT NULL, ts INTEGER NOT NULL, type TEXT NOT NULL,
        mission TEXT, value REAL, region TEXT, x REAL, z REAL
    )');
    $db->exec('CREATE INDEX IF NOT EXISTS ev_ts ON events(ts)');
    $db->exec('CREATE INDEX IF NOT EXISTS se_started ON sessions(started)');
    $db->exec('CREATE TABLE IF NOT EXISTS login_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, ip TEXT NOT NULL, ts INTEGER NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)');
    $db->exec('CREATE TABLE IF NOT EXISTS mission_names (id TEXT PRIMARY KEY, title TEXT)');
    auto_backup($db);
    return $db;
}

/** Monatliche Sicherung mit zufälligem Dateinamen (Verzeichnis per .htaccess gesperrt). */
function auto_backup(PDO $db): void {
    $monat = date('Y-m');
    $st = $db->prepare('SELECT v FROM meta WHERE k = ?'); $st->execute(['backup']);
    if ($st->fetchColumn() === $monat || !is_file(DB_PATH)) return;
    if (!is_dir(BACKUP_DIR)) mkdir(BACKUP_DIR, 0775, true);
    @copy(DB_PATH, BACKUP_DIR . '/stats-' . $monat . '-' . bin2hex(random_bytes(5)) . '.sqlite');
    $db->prepare('INSERT OR REPLACE INTO meta (k, v) VALUES (?, ?)')->execute(['backup', $monat]);
}

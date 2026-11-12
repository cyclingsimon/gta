<?php
// Empfängt anonyme Spielstatistik vom Spiel (gleiche Domain, navigator.sendBeacon).
// Gespeichert werden keine IP-Adressen und keine Namen – nur eine zufällige Geräte-ID und Spielwerte.
declare(strict_types=1);
require __DIR__ . '/inc/db.php';
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit('nur POST'); }
$raw = file_get_contents('php://input', false, null, 0, 65536);
$d = json_decode((string)$raw, true);
$id = fn($v) => is_string($v) && preg_match('/^[a-z0-9]{8,40}$/', $v) ? $v : null;
$txt = fn($v, int $n = 24) => is_string($v) ? mb_substr(preg_replace('/[^\p{L}\p{N} ._:x×\-]/u', '', $v), 0, $n) : null;
$num = fn($v, float $max) => is_numeric($v) ? max(0.0, min((float)$v, $max)) : 0.0;
if (!is_array($d) || !($sid = $id($d['sid'] ?? null)) || !($dev = $id($d['dev'] ?? null))) { http_response_code(400); exit('ungültig'); }

$db = db(); $now = time(); $t = is_array($d['tot'] ?? null) ? $d['tot'] : [];
$db->beginTransaction();
$db->prepare('INSERT OR IGNORE INTO sessions (sid, device, started, last) VALUES (?, ?, ?, ?)')->execute([$sid, $dev, $now, $now]);
// Summen sind je Sitzung fortlaufend: nur wachsen lassen (doppelt gesendete Pakete schaden nicht)
$db->prepare('UPDATE sessions SET last = ?, version = COALESCE(?, version), region = COALESCE(?, region), quality = COALESCE(?, quality),
    mobile = ?, screen = COALESCE(?, screen), lang = COALESCE(?, lang),
    active_s = MAX(active_s, ?), dist_m = MAX(dist_m, ?), max_kmh = MAX(max_kmh, ?), siren_s = MAX(siren_s, ?),
    horns = MAX(horns, ?), boings = MAX(boings, ?), hearts = MAX(hearts, ?), m_accept = MAX(m_accept, ?), m_done = MAX(m_done, ?),
    stars = MAX(stars, ?), players = MAX(players, ?), region_switches = MAX(region_switches, ?), splashes = MAX(splashes, ?)
    WHERE sid = ? AND device = ?')->execute([
    $now, $txt($d['v'] ?? null), $txt($d['region'] ?? null, 12), $txt($d['q'] ?? null, 12), !empty($d['mob']) ? 1 : 0,
    $txt($d['scr'] ?? null, 12), $txt($d['lang'] ?? null, 8),
    $num($t['active_s'] ?? 0, 86400), $num($t['dist_m'] ?? 0, 2e6), $num($t['max_kmh'] ?? 0, 400), $num($t['siren_s'] ?? 0, 86400),
    (int)$num($t['horns'] ?? 0, 1e5), (int)$num($t['boings'] ?? 0, 1e5), (int)$num($t['hearts'] ?? 0, 1000), (int)$num($t['m_accept'] ?? 0, 1e4),
    (int)$num($t['m_done'] ?? 0, 1e4), (int)$num($t['stars'] ?? 0, 1e5), (int)$num($d['players'] ?? 1, 4), (int)$num($t['region_switches'] ?? 0, 1e4),
    (int)$num($t['splashes'] ?? 0, 1e5), $sid, $dev]);
$n = $db->prepare('SELECT COUNT(*) FROM events WHERE sid = ?'); $n->execute([$sid]);
$platz = 3000 - (int)$n->fetchColumn();
$ins = $db->prepare('INSERT INTO events (sid, ts, type, mission, value, region, x, z) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
foreach (array_slice(is_array($d['ev'] ?? null) ? $d['ev'] : [], 0, max(0, min(200, $platz))) as $e) {
    if (!is_array($e) || !($typ = $txt($e['type'] ?? null, 20))) continue;
    $ts = is_numeric($e['t'] ?? null) ? (int)min($now, max($now - 86400, (int)$e['t'])) : $now;
    if ($typ === 'mission_accept' && ($mid = $txt($e['m'] ?? null, 12)) && ($tit = $txt($e['n'] ?? null, 60)))
        $db->prepare('INSERT OR REPLACE INTO mission_names (id, title) VALUES (?, ?)')->execute([$mid, $tit]);
    $ins->execute([$sid, $ts, $typ, $txt($e['m'] ?? null, 12), is_numeric($e['val'] ?? null) ? (float)$e['val'] : null,
        $txt($e['region'] ?? null, 12), is_numeric($e['x'] ?? null) ? round((float)$e['x']) : null, is_numeric($e['z'] ?? null) ? round((float)$e['z']) : null]);
}
$db->commit();
echo 'ok';

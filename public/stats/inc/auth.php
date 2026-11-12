<?php
// Login für das Dashboard (ein Nutzer, bcrypt, CSRF, Drosselung).
declare(strict_types=1);
require_once __DIR__ . '/db.php';
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS']), 'path' => dirname($_SERVER['SCRIPT_NAME']) ?: '/']);
session_name('luksistats');
session_start();

function csrf_token(): string { if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32)); return $_SESSION['csrf']; }
function csrf_check(): void { if (!hash_equals($_SESSION['csrf'] ?? '', $_POST['csrf'] ?? '')) { http_response_code(400); exit('Ungültiges Token.'); } }
function h(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

function login_gedrosselt(PDO $db, string $ip): bool {
    $st = $db->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND ts > ?'); $st->execute([$ip, time() - 900]);
    return (int)$st->fetchColumn() >= 5;
}

function require_login(): void {
    if (!empty($_SESSION['auth'])) return;
    $db = db(); $ip = $_SERVER['REMOTE_ADDR'] ?? '?'; $fehler = '';
    if (APP_PASSWORD_HASH === 'ÄNDERE_MICH') $fehler = 'Passwort ist noch nicht gesetzt (config.php).';
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['pw'])) {
        csrf_check();
        if (login_gedrosselt($db, $ip)) $fehler = 'Zu viele Versuche. Bitte 15 Minuten warten.';
        elseif (password_verify($_POST['pw'], APP_PASSWORD_HASH)) {
            session_regenerate_id(true); $_SESSION['auth'] = true;
            $db->prepare('DELETE FROM login_attempts WHERE ip = ?')->execute([$ip]);
            header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?')); exit;
        } else { $db->prepare('INSERT INTO login_attempts (ip, ts) VALUES (?, ?)')->execute([$ip, time()]); $fehler = 'Falsches Passwort.'; }
    }
    ?><!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Luksi Rescue – Statistik</title><link rel="stylesheet" href="app.css"></head><body class="login">
<form method="post" class="karte"><h1>🚑 Luksi Rescue · Statistik</h1>
<?php if ($fehler) echo '<p class="fehler">' . h($fehler) . '</p>'; ?>
<input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
<label>Passwort <input type="password" name="pw" autofocus autocomplete="current-password"></label>
<button>Anmelden</button></form></body></html><?php
    exit;
}

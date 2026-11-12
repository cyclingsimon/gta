<?php
// Dashboard der Spielstatistik (unabhängig von der Spielversion).
declare(strict_types=1);
require __DIR__ . '/inc/auth.php';
require_login();
date_default_timezone_set('Europe/Zurich');
$db = db();
$tage = in_array((int)($_GET['tage'] ?? 30), [1, 7, 30, 90, 3650], true) ? (int)($_GET['tage'] ?? 30) : 30;
$ab = $tage >= 3650 ? 0 : strtotime('today') - ($tage - 1) * 86400;
$ohneTest = 'started >= :ab AND active_s >= 10'; // Sitzungen unter 10 s aktiver Zeit gelten als blosses Öffnen
$q = function (string $sql, array $p = []) use ($db) { $st = $db->prepare($sql); $st->execute($p); return $st; };
$k = $q("SELECT COUNT(*) n, COUNT(DISTINCT device) dev, COALESCE(SUM(active_s),0) akt, COALESCE(SUM(dist_m),0) dist, COALESCE(SUM(m_accept),0) ma,
    COALESCE(SUM(m_done),0) md, COALESCE(SUM(stars),0) st, COALESCE(SUM(hearts),0) he, COALESCE(SUM(horns),0) ho, COALESCE(SUM(siren_s),0) si,
    COALESCE(MAX(max_kmh),0) vmax, COALESCE(SUM(boings),0) bo, COALESCE(SUM(splashes),0) sp, COALESCE(SUM(region_switches),0) rw
    FROM sessions WHERE $ohneTest", [':ab' => $ab])->fetch();
$geoeffnet = (int)$q('SELECT COUNT(*) FROM sessions WHERE started >= ?', [$ab])->fetchColumn();
$dauern = array_map('floatval', $q("SELECT active_s FROM sessions WHERE $ohneTest ORDER BY active_s", [':ab' => $ab])->fetchAll(PDO::FETCH_COLUMN));
$median = $dauern ? $dauern[intdiv(count($dauern), 2)] : 0;
$proTag = [];
foreach ($q("SELECT started, active_s, dist_m FROM sessions WHERE $ohneTest", [':ab' => $ab]) as $r) {
    $tg = date('Y-m-d', (int)$r['started']); $proTag[$tg] = ($proTag[$tg] ?? [0, 0, 0]);
    $proTag[$tg][0] += $r['active_s'] / 60; $proTag[$tg][1] += $r['dist_m'] / 1000; $proTag[$tg][2]++;
}
ksort($proTag);
$stunden = array_fill(0, 24, 0);
foreach ($q("SELECT started, active_s FROM sessions WHERE $ohneTest", [':ab' => $ab]) as $r) $stunden[(int)date('G', (int)$r['started'])] += $r['active_s'] / 60;
$klassen = ['< 2 Min.' => 120, '2–5' => 300, '5–10' => 600, '10–20' => 1200, '20–40' => 2400, '> 40 Min.' => INF]; $hist = array_fill_keys(array_keys($klassen), 0);
foreach ($dauern as $s) foreach ($klassen as $name => $gr) if ($s < $gr) { $hist[$name]++; break; }
$missionen = $q("SELECT mission, SUM(type='mission_accept') ang, SUM(type='mission_done') fertig, AVG(CASE WHEN type='mission_done' THEN value END) dauer FROM events WHERE ts >= ? AND mission IS NOT NULL GROUP BY mission ORDER BY fertig DESC, ang DESC", [$ab])->fetchAll();
$titel = $q('SELECT id, title FROM mission_names')->fetchAll(PDO::FETCH_KEY_PAIR);
$verteilung = fn(string $feld) => $q("SELECT COALESCE($feld, '?') k, COUNT(*) n, SUM(active_s) s FROM sessions WHERE $ohneTest GROUP BY 1 ORDER BY s DESC", [':ab' => $ab])->fetchAll();
$punkte = $q("SELECT x, z, region FROM events WHERE ts >= ? AND type = 'pos' AND x IS NOT NULL ORDER BY id DESC LIMIT 6000", [$ab])->fetchAll();
$letzte = $q('SELECT * FROM sessions WHERE active_s >= 10 ORDER BY last DESC LIMIT 25')->fetchAll();

function zahl(float $n, int $d = 0): string { return number_format($n, $d, '.', "'"); }
function dauer(float $s): string { $m = (int)round($s / 60); return $m >= 60 ? intdiv($m, 60) . ' h ' . ($m % 60) . ' Min.' : $m . ' Min.'; }
function balken(array $werte, string $einheit, int $h = 140): string {
    if (!$werte) return '<p class="leer">Noch keine Daten.</p>';
    $max = max(max($werte), 1e-9); $n = count($werte); $w = 100 / $n; $o = '<svg viewBox="0 0 100 ' . $h . '" preserveAspectRatio="none" class="balken" role="img">';
    $i = 0; foreach ($werte as $lab => $v) { $bh = $v / $max * $h; $x = $i * $w;
        $o .= '<rect x="' . round($x + $w * 0.12, 2) . '" y="' . round($h - $bh, 2) . '" width="' . round($w * 0.76, 2) . '" height="' . round(max($bh, 0.3), 2) . '"><title>' . h((string)$lab) . ': ' . zahl($v, $v < 10 ? 1 : 0) . ' ' . $einheit . '</title></rect>';
        $i++; }
    $o .= '</svg><div class="achse">'; $i = 0; // Beschriftung als HTML (SVG wird in die Breite gezogen)
    foreach ($werte as $lab => $v) { $o .= '<span>' . ($n <= 12 || $i % max(1, intdiv($n, 8)) === 0 ? h((string)$lab) : '') . '</span>'; $i++; }
    return $o . '</div>';
}
$tagLab = []; foreach ($proTag as $tg => $v) $tagLab[date('j.n.', strtotime($tg))] = $v[0];
?><!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Luksi Rescue – Statistik</title><link rel="stylesheet" href="app.css"></head><body>
<header><h1>🚑 Luksi Rescue · Statistik</h1>
<nav><?php foreach ([1 => 'Heute', 7 => '7 Tage', 30 => '30 Tage', 90 => '90 Tage', 3650 => 'Alles'] as $t => $l) echo '<a href="?tage=' . $t . '"' . ($t === $tage ? ' class="aktiv"' : '') . '>' . $l . '</a>'; ?></nav></header>
<main>
<section class="kpis">
  <div><b><?= dauer((float)$k['akt']) ?></b><span>Spielzeit total</span></div>
  <div><b><?= zahl((float)$k['n']) ?></b><span>Spielsitzungen<?= $geoeffnet > $k['n'] ? ' (+' . ($geoeffnet - $k['n']) . ' nur geöffnet)' : '' ?></span></div>
  <div><b><?= $k['n'] ? dauer($k['akt'] / $k['n']) : '–' ?></b><span>Ø je Sitzung · Median <?= dauer($median) ?></span></div>
  <div><b><?= zahl($k['dist'] / 1000, 1) ?> km</b><span>gefahren · Spitze <?= zahl((float)$k['vmax']) ?> km/h</span></div>
  <div><b><?= zahl((float)$k['md']) ?> / <?= zahl((float)$k['ma']) ?></b><span>Einsätze erledigt / angenommen<?= $k['ma'] ? ' · ' . round($k['md'] / $k['ma'] * 100) . ' %' : '' ?></span></div>
  <div><b><?= zahl((float)$k['st']) ?> ★</b><span>Sterne · <?= zahl((float)$k['he']) ?> Herzen</span></div>
  <div><b><?= zahl((float)$k['dev']) ?></b><span>Geräte</span></div>
  <div><b><?= zahl((float)$k['ho']) ?></b><span>Hupen · <?= dauer((float)$k['si']) ?> Blaulicht</span></div>
  <div><b><?= zahl((float)$k['bo']) ?></b><span>Kegel umgefahren · <?= zahl((float)$k['sp']) ?>× ins Wasser</span></div>
  <div><b><?= zahl((float)$k['rw']) ?></b><span>Wechsel Luzern ↔ Nord</span></div>
</section>
<section><h2>Spielzeit pro Tag (Minuten)</h2><?= balken($tagLab, 'Min.') ?></section>
<section class="zwei">
  <div><h2>Sitzungsdauer</h2><?= balken($hist, 'Sitzungen', 110) ?></div>
  <div><h2>Tageszeit (Start, Minuten)</h2><?= balken(array_combine(array_map(fn($x) => (string)$x, range(0, 23)), $stunden), 'Min.', 110) ?></div>
</section>
<section><h2>Einsätze</h2>
<?php if (!$missionen) echo '<p class="leer">Noch keine Einsätze.</p>'; else { ?>
<div class="tab"><table><thead><tr><th>Einsatz</th><th>angenommen</th><th>erledigt</th><th>Ø Dauer</th></tr></thead><tbody>
<?php foreach ($missionen as $m) echo '<tr><td>' . h(($titel[$m['mission']] ?? '') ? $titel[$m['mission']] . ' (' . $m['mission'] . ')' : $m['mission']) . '</td><td>' . (int)$m['ang'] . '</td><td>' . (int)$m['fertig'] . '</td><td>' . ($m['dauer'] ? dauer((float)$m['dauer']) : '–') . '</td></tr>'; ?>
</tbody></table></div><?php } ?></section>
<section><h2>Wo gefahren wird</h2>
<?php if (!$punkte) echo '<p class="leer">Noch keine Positionen.</p>'; else {
  // Ganzes Spielgebiet: Luzern (x −3800..2700, z −1100..6300) und Nord (z bis −3900)
  echo '<svg viewBox="-3800 -3900 8400 10200" class="karte-svg" role="img"><rect x="-3800" y="-3900" width="8400" height="10200" class="feld"/>';
  echo '<line x1="-3800" y1="-1000" x2="4600" y2="-1000" class="grenze"/><text x="-3700" y="-1080">Nord</text><text x="-3700" y="-850">Luzern</text>';
  foreach ($punkte as $p) echo '<circle cx="' . (int)$p['x'] . '" cy="' . (int)$p['z'] . '" r="45"/>';
  echo '</svg><p class="hinweis">Ein Punkt pro Spielminute (letzte 6000). Norden oben.</p>'; } ?></section>
<section class="drei">
<?php foreach (['region' => 'Region', 'version' => 'Spielversion', 'quality' => 'Grafik'] as $f => $titel) { echo '<div><h2>' . $titel . '</h2><table>';
  foreach ($verteilung($f) as $r) echo '<tr><td>' . h($r['k']) . '</td><td>' . (int)$r['n'] . ' Sitz.</td><td>' . dauer((float)$r['s']) . '</td></tr>';
  echo '</table></div>'; } ?>
  <div><h2>Gerät</h2><table><?php foreach ($q("SELECT CASE mobile WHEN 1 THEN 'Handy/Tablet' ELSE 'Computer' END k, COUNT(*) n, SUM(active_s) s FROM sessions WHERE $ohneTest GROUP BY 1", [':ab' => $ab]) as $r) echo '<tr><td>' . h($r['k']) . '</td><td>' . (int)$r['n'] . ' Sitz.</td><td>' . dauer((float)$r['s']) . '</td></tr>'; ?></table></div>
</section>
<section><h2>Letzte Sitzungen</h2><div class="tab"><table><thead><tr><th>Start</th><th>Dauer</th><th>km</th><th>Einsätze</th><th>Sterne</th><th>Region</th><th>Version</th><th>Gerät</th></tr></thead><tbody>
<?php foreach ($letzte as $s) echo '<tr><td>' . date('j.n. H:i', (int)$s['started']) . '</td><td>' . dauer((float)$s['active_s']) . '</td><td>' . zahl($s['dist_m'] / 1000, 1) . '</td><td>' . (int)$s['m_done'] . '/' . (int)$s['m_accept'] . '</td><td>' . (int)$s['stars'] . '</td><td>' . h($s['region']) . '</td><td>' . h($s['version']) . '</td><td>' . ($s['mobile'] ? '📱' : '💻') . ' ' . h($s['screen']) . ($s['players'] > 1 ? ' · ' . (int)$s['players'] . ' Spieler' : '') . '</td></tr>'; ?>
</tbody></table></div></section>
<footer>Anonym: zufällige Geräte-ID, keine IP-Adressen, keine Namen. Spielzeit = Zeit mit laufendem Spiel (Pause und verstecktes Fenster zählen nicht). Sitzungen unter 10 Sekunden zählen als «nur geöffnet».</footer>
</main></body></html>

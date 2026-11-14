#!/bin/sh
# Baut dist/ (oder $OUT) und komprimiert grosse Daten (Spiel lädt *.gz und entpackt im Browser)
# OUT=dist_next sh tools/dist.sh  → baut daneben, ohne laufende Tests auf dist/ zu stören; dann tools/swap.sh
set -e
cd "$(dirname "$0")/.."
O=${OUT:-dist}
npx vite build --outDir "$O" --emptyOutDir
rm -rf "$O/data" && cp -r public/data "$O/data"
for f in b3d.bin ground.bin terrain.bin city.json b3d.json; do gzip -9 -c "public/data/$f" > "$O/data/$f.gz"; rm "$O/data/$f"; done
for r in nord ost west sued a1 a2 a3 a4 a5 a6 a7 a8 a9 a10 a11 a12 a13 a14; do [ -d "public/data/$r" ] || { echo "HINWEIS: Region $r fehlt (nicht im Paket)"; continue; }; for f in b3d.bin ground.bin terrain.bin city.json b3d.json; do [ -f "public/data/$r/$f" ] || continue; gzip -9 -c "public/data/$r/$f" > "$O/data/$r/$f.gz"; rm "$O/data/$r/$f"; done; done
cp public/LIESMICH.txt "$O/"
du -sh "$O"

# Statistik: nie eine lokale Test-Datenbank ausliefern (die Server-DB bleibt beim Überschreiben unberührt)
rm -rf "$O"/stats/data/*.sqlite* "$O/stats/data/backups"
[ -f "$O/stats/config.php" ] || echo "WARNUNG: $O/stats/config.php fehlt (data/stats_config.php kopieren)"

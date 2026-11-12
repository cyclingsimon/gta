#!/bin/sh
# Baut dist/ und komprimiert grosse Daten (Spiel lädt *.gz und entpackt im Browser)
set -e
cd "$(dirname "$0")/.."
npx vite build
rm -rf dist/data && cp -r public/data dist/data
for f in b3d.bin ground.bin terrain.bin city.json b3d.json; do gzip -9 -c "public/data/$f" > "dist/data/$f.gz"; rm "dist/data/$f"; done
for f in b3d.bin ground.bin terrain.bin city.json b3d.json; do gzip -9 -c "public/data/nord/$f" > "dist/data/nord/$f.gz"; rm "dist/data/nord/$f"; done
cp public/LIESMICH.txt dist/
du -sh dist

# Statistik: nie eine lokale Test-Datenbank ausliefern (die Server-DB bleibt beim Überschreiben unberührt)
rm -rf dist/stats/data/*.sqlite* dist/stats/data/backups
[ -f dist/stats/config.php ] || echo "WARNUNG: dist/stats/config.php fehlt (data/stats_config.php kopieren)"

#!/bin/sh
# dist_next → dist tauschen (Testserver liefert danach den neuen Stand)
cd "$(dirname "$0")/.."
[ -d dist_next ] || exit 1
rm -rf dist_old; mv dist dist_old && mv dist_next dist && rm -rf dist_old && echo getauscht

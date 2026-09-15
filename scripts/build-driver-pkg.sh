#!/bin/bash
# Build the bundled Eleven Rack audio driver installer from driver/ (Matt
# Housley's driver, Eleven Edit build) into dist/driver/. Runs his own
# packaging/build_pkg.sh; honours SIGN_ID / PKG_SIGN_ID for a Developer ID
# signed installer. The DMG build (npm run build:mac) picks the .pkg up.
set -euo pipefail
cd "$(dirname "$0")/.."
export ER_BUILD_DIR="${ER_BUILD_DIR:-/private/tmp/ElevenRack-build}"
bash driver/packaging/build_pkg.sh
mkdir -p dist/driver
cp driver/dist/ElevenRackDriver-*.pkg dist/driver/
PKG="$(ls -t dist/driver/ElevenRackDriver-*.pkg | head -1)"
cp "$PKG" "dist/driver/Install Eleven Rack Audio Driver.pkg"
echo "Driver installer: dist/driver/Install Eleven Rack Audio Driver.pkg ($(basename "$PKG"))"

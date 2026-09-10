#!/bin/bash
# Signed + notarised macOS release (Gumroad / public download quality).
#
# ONE-TIME SETUP (needs your Apple Developer account — I can't do these for you):
#   1. developer.apple.com → Certificates → "+" → "Developer ID Application" →
#      upload a CSR from Keychain Access (Certificate Assistant → Request a
#      Certificate From a Certificate Authority → save to disk) → download the
#      .cer → double-click to install. `security find-identity -v -p codesigning`
#      must then list "Developer ID Application: <Name> (<TEAMID>)".
#   2. appleid.apple.com → Sign-In and Security → App-Specific Passwords → make one
#      named "notarytool", then store it in the keychain (asks for your Apple ID,
#      team ID and that password; nothing is written to disk in this repo):
#        xcrun notarytool store-credentials elevenedit-notary
#
# THEN, every release:  npm run release:mac
set -euo pipefail
cd "$(dirname "$0")/.."
PROFILE="${APPLE_KEYCHAIN_PROFILE:-elevenedit-notary}"
IDENT="$(security find-identity -v -p codesigning | grep -m1 'Developer ID Application' | sed -E 's/.*"(.*)"/\1/' || true)"
[ -n "$IDENT" ] || { echo "No 'Developer ID Application' certificate in the keychain — see the setup notes at the top of this script."; exit 1; }
xcrun notarytool history --keychain-profile "$PROFILE" >/dev/null 2>&1 || { echo "No notarytool keychain profile '$PROFILE' — run: xcrun notarytool store-credentials $PROFILE"; exit 1; }
echo "Signing as: $IDENT"
export CSC_NAME="$IDENT"
export APPLE_KEYCHAIN_PROFILE="$PROFILE"
unset CSC_IDENTITY_AUTO_DISCOVERY
rm -rf dist
npm run build:mac
echo "--- verification ---"
for A in dist/mac-arm64 dist/mac; do
  codesign --verify --deep --strict --verbose=2 "$A/Eleven Edit.app" && echo "$A: signature OK"
  spctl --assess --type execute --verbose=2 "$A/Eleven Edit.app" && echo "$A: Gatekeeper accepts"
done
for D in dist/*.dmg; do xcrun stapler validate "$D" && echo "$D: notarisation ticket stapled"; done
echo "Release DMGs: $(ls dist/*.dmg | tr '\n' ' ')"

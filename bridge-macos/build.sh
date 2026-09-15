#!/bin/bash
# Builds the macOS native MIDI bridge as a universal (arm64 + x86_64) binary,
# ad-hoc signed so it runs on Apple Silicon. Output: bridge-macos/ElevenRackBridge
# (a gitignored build artifact, like ElevenRackBridge.jar on Windows).
set -euo pipefail
cd "$(dirname "$0")"
MIN_MACOS="${MIN_MACOS:-12.0}"
echo "Building ElevenRackBridge (arm64)..."
swiftc -O -suppress-warnings -target arm64-apple-macos${MIN_MACOS}  ElevenRackBridge.swift -o ElevenRackBridge-arm64
echo "Building ElevenRackBridge (x86_64)..."
swiftc -O -suppress-warnings -target x86_64-apple-macos${MIN_MACOS} ElevenRackBridge.swift -o ElevenRackBridge-x86_64
lipo -create ElevenRackBridge-arm64 ElevenRackBridge-x86_64 -output ElevenRackBridge
rm -f ElevenRackBridge-arm64 ElevenRackBridge-x86_64
codesign --force --sign - ElevenRackBridge
chmod 755 ElevenRackBridge
echo "OK: $(pwd)/ElevenRackBridge"
lipo -info ElevenRackBridge

# VU meter feed: reads the audio driver's shared ring (driver/ElevenRackBridge/erlevels.c).
echo "Building erlevels (universal)..."
clang -O2 -arch arm64 -arch x86_64 -mmacosx-version-min=${MIN_MACOS} -I ../driver/ElevenRackBridge \
  -o erlevels ../driver/ElevenRackBridge/erlevels.c
codesign --force --sign - erlevels
chmod 755 erlevels
echo "OK: $(pwd)/erlevels"

# 11 Edit — Eleven Edit for Mac

11 Edit is the macOS build of Charles Wardick's Eleven Edit: a free rig editor and librarian for the Avid Eleven Rack, controlled from your
computer over USB/MIDI. No iLok and no Avid Eleven Rack Editor required —
just the Avid USB driver and a connected Eleven Rack.

> **Status:** 11 Edit 1.1.0 for macOS (2026-09-15) — the Studio interface, real VU meters from the bundled audio driver, knobs or sliders. Upstream Eleven Edit for Windows is v1.0.0. Released as-is. See the
> disclaimer below and **always back up your unit before loading banks.**
>
> **macOS build (2026-09-10):** a native Mac port now exists — same app, same
> renderer, with the Java bridge replaced by a small CoreMIDI bridge (no Java,
> no Avid driver needed). Verified against a real Eleven Rack (firmware
> 2.0.1 build 0.1.5.7) on an Apple Silicon Mac. See [macOS](#macos) below.

![Eleven Edit v1.0.0 — the main patch editor and audition screen, connected to an Eleven Rack](assets/screenshot.png)

## What it does

- Browse, edit, and organize the rigs on your Eleven Rack — live knob and
  effect-panel editing that mirrors the hardware, patch navigation with a
  jump-to-any-slot/by-name list, and inline renaming.
- Save edits to any rack slot or to disk as a `.tfx` file; load a `.tfx`
  back in for further editing.
- Back up all 104 user/factory slots to disk in one pass, and restore from
  a backup with a full preview of what will change before anything is
  written.
- A dedicated Rig Balancing screen for leveling output volume across every
  user rig, with buffered edits you can discard cleanly if you change your
  mind partway through.
- An Auto Advance mode for hands-free auditioning of a whole bank.

## Architecture

Eleven Edit is an Electron desktop app. A small Java WebSocket bridge
(`ElevenRackBridge.jar`) owns all MIDI hardware access via `javax.sound.midi`;
the Electron renderer talks to it over `ws://localhost:57121`. The app does
**not** run on the Eleven Rack — it remote-controls the hardware over MIDI.

On macOS the same renderer talks the same WebSocket protocol to a native
CoreMIDI bridge instead (`bridge-macos/ElevenRackBridge.swift`, a single
~450-line Swift program built as a universal binary and bundled inside the
app). Java is only needed on Windows, where it is the one MIDI layer that can
see the Avid driver's "Vendor Specific" port; macOS exposes the Eleven Rack's
USB-MIDI ports natively.

Built with [Claude Code](https://www.anthropic.com/claude-code), Anthropic's AI
coding assistant.

## Requirements

- An Avid Eleven Rack connected over USB.
- The Avid Eleven Rack USB driver installed — **v1.1.12 (recommended) or
  v1.0.11** both work. Eleven Edit talks through the operating system's MIDI
  layer, so it is driver-version-agnostic; any working Avid driver is fine, and
  the Avid Eleven Rack Editor itself is not needed, just its driver.
- A Java runtime for the bridge — **JRE 25 or newer required.** Older
  versions (including JRE 8 and JRE 21) have been directly tested and found to
  freeze or crash Windows when running Eleven Edit; the app checks this on
  startup and won't launch the bridge against a JRE below 25.
- **Windows 10 or Windows 11** — the platforms tested against real hardware.
  A macOS build exists (below); Linux is untested.

### macOS

- Any Mac running **macOS 12 Monterey or later**, Apple Silicon or Intel
  (the DMG ships one build per architecture).
- An Avid Eleven Rack connected over USB. **No Avid driver and no Java
  runtime are needed.** macOS's built-in class USB-MIDI driver exposes the
  rack's two MIDI ports on its own — they appear in Audio MIDI Setup as
  **Eleven Rack Rig** (the internal port the editor protocol lives on) and
  **Eleven Rack External** (the rear-panel DIN jacks). 11 Edit picks
  Rig in / Rig out automatically; both pickers stay user-overridable.
- Audio over USB is a separate matter Eleven Edit doesn't touch: Avid never
  shipped an Apple Silicon audio driver, but Matt Housley's open-source
  [Eleven Rack Driver](https://github.com/Matt-Housley/eleven-rack-driver)
  covers it if you want the rack as a Core Audio device too.
- **Verified on real hardware (2026-09-10):** an Eleven Rack on firmware
  2.0.1 build 0.1.5.7, plugged into an M1 Max MacBook Pro on macOS 26, was
  found on the Rig ports automatically and answered the full startup sweep
  (identity, patch name, chain map, 16 parameter reads) in about half a
  second. As a safety net, if a rack ever fails the identity check on the Rig
  pair, 11 Edit tries the other Rig/External combinations once each before
  showing the firmware gate, and remembers whichever pair answered. Intel
  Macs get the x64 build but have not been tried.
- **Firmware:** the startup identity check accepts build 0.1.5.7 (firmware
  2.0.1, fully verified) and build 0.1.5.3 (firmware 2.0, the first Expansion
  Pack release, added from a user report — see the table below). Anything
  else is refused on purpose; the gate is a hardware-safety measure.

### Compatibility reports

| Mac | macOS | Rack firmware | Result | Reported by |
|---|---|---|---|---|
| MacBook Pro M1 Max | 26.6.2 | 2.0.1 (build 0.1.5.7) | Works, full session | author |
| MacBook Pro M4 | Tahoe | 2.0 (build 0.1.5.3) | Works | kdbo (PR #1) |

Add yours: open an issue with your Mac, macOS version and the rack's
reported build (the splash screen shows it if the check fails).
- The app is not code-signed with an Apple Developer ID (there is no paid
  certificate behind this project). On first launch macOS will say it can't
  verify the app: **right-click → Open → Open**, or allow it under System
  Settings → Privacy & Security. Once is enough.

### The real prerequisite (and a note on Windows 11)

Eleven Edit is a *passenger*: it runs in user space on top of Windows, the Avid
USB driver, and Java, and it cannot cause a Windows crash. So the only real
prerequisite is a machine that stays stable with the Avid driver installed:
install the Avid USB driver and JRE 25/26, connect the rack, and reboot a couple
of times with it plugged in. If Windows is stable that way, Eleven Edit runs on
top of it fine. If the PC is **not** stable with just the driver installed —
before Eleven Edit is even involved — that's an Avid-driver/Windows matter to
sort out first, not an Eleven Edit one.

Windows 10 has been rock-solid throughout. Windows 11 is more prone to Avid
driver trouble in general — Avid's own Eleven Rack Editor is known not to run
(and sometimes to crash the machine) on Windows 11. Eleven Edit itself is
unaffected by the Editor's problems, but it still rides on the same USB driver,
so if a Windows 11 machine is unstable with the driver installed: keep the Eleven
Rack off the Windows **default sound device** role, or use the lighter 1.0.11
driver. The User Manual's Troubleshooting section has the full rundown, including
a separate Windows 11 note about bank/patch **uploads**.

## Build

Build from source:

```
npm install
npm run build
```

This produces a Windows installer (`.exe`) in the `dist` folder via
electron-builder. Run it — it'll show a license/terms screen, check for
a working Java runtime, and install Eleven Edit like any other Windows
app.

### Building for macOS

Needs Node and the Xcode Command Line Tools (`xcode-select --install` gives
you `swiftc`, `lipo`, `codesign` and `iconutil`).

```
npm install
npm run build:mac          # arm64 + x64 DMGs and zips into dist/
```

`build:mac` first runs `bridge-macos/build.sh`, which compiles
`ElevenRackBridge.swift` into a universal, ad-hoc-signed binary
(`bridge-macos/ElevenRackBridge`, a gitignored build artifact like the jar),
then packages it inside `Eleven Edit.app/Contents/Resources`. If the npm
version in use refuses to run Electron's post-install script, run
`node node_modules/electron/install.js` once by hand. The `.icns` app icon is
generated from the same drawing code as the Windows icon with
`npm run icons:mac` (needs Pillow).

**Audio driver (bundled):** the DMG carries `Install Eleven Rack Audio
Driver.pkg`, the Eleven Edit build of [Matt Housley's user-space Core Audio
driver](https://github.com/Matt-Housley/eleven-rack-driver) (MIT, vendored under
`driver/`). It makes the rack an 8-in / 6-out Core Audio device on Apple
Silicon (macOS 13+). `npm run build:driver` builds it; `npm run test:driver`
runs the playback-servo simulation. What changed versus upstream is in
`driver/History.txt` under 1.2.0.

**Signed + notarised release** (no Gatekeeper prompt for users): once a
"Developer ID Application" certificate is in the keychain and a `notarytool`
keychain profile exists (one-time steps documented at the top of
`scripts/release-mac.sh`), `npm run release:mac` signs with the hardened runtime
(`build/entitlements.mac.plist`), notarises, staples and verifies both DMGs.
Without the certificate the build falls back to the ad-hoc signature above.

Tests, no hardware needed: `npm run test:bridge:mac` drives the bridge over
its WebSocket protocol against a virtual Eleven Rack (identity request, PC/CC,
a 1300-byte SysEx reassembled whole, error paths, graceful shutdown);
`bridge-macos/tests/app-smoke.sh` launches the whole app in dev mode
against that virtual rack and checks the startup handshake in the session log;
`bridge-macos/tests/packaged-smoke.sh` does the same with the BUILT app,
launched through Finder's `open` and quit with an Apple Event, which is the
path a user actually takes (a shell launch inherits the shell's file
permissions and can hide problems). Dev run: `./node_modules/.bin/electron . --logs`.

### Building the Java bridge

`npm run build` bundles a prebuilt `ElevenRackBridge.jar` but does **not**
compile it. The jar is a build artifact and is not committed to the repo
(only the source, `ElevenRackBridge.java`, is). Compile it once, from the
repo root, with **JDK 25 or newer**:

```
javac ElevenRackBridge.java
jar --create --file ElevenRackBridge.jar --main-class ElevenRackBridge ElevenRackBridge*.class
```

This writes `ElevenRackBridge.jar` in the repo root, where `npm run build`
picks it up. The intermediate `*.class` files can be deleted afterwards.

## The Studio interface (macOS build, 2026-09-15)

The Mac build draws the editor as a glass console:

- **Top bar** — an amber LCD with the slot, patch name (click to rename; left
  half opens the user patch list, right half the factory list) and the
  amp · cab · mic line; bank/patch steppers; input selector; tuner.
- **Signal path** — one glass tile per block with an LED for its state. Click
  a tile to focus it, click its name to bypass it, drag it to reorder.
- **Focus** — the amp is drawn on a lit stage in one of nine visual families
  (tweed, black panel, AC, plexi, lead, tread plate, blue line, RB, DC) with
  its tone knobs, Bright/Tremolo/Sync and the knob-order dock on its own
  panel, the cab's speaker count on the grille and the model name on the
  plate. Next to it, one card holds the amp model, what it is based on, the
  backline thumbnails (click one to switch family), cab, mic, axis, speaker
  breakup and True-Z. An effect opens as a stompbox with its real knobs,
  toggles and model picker, a footswitch that bypasses it and an LED that
  follows the block state.
- **Master section** — gate, To Amp 1/2 with sources, amp out and rig volume
  on Neve-capped glass knobs (red caps on gain/level, blue on tone, grey on
  dynamics, the band colour on Parametric EQ); two VU meters; phones and main
  volume with mutes; tempo; the rig & bank buttons (Save, Load TFX, Export,
  Import, Rig Balancing, Patches, About, Manual, Settings) and the two
  global switches.
- **Auto advance** and the status bar as before.

**VU meters.** With the bundled audio driver installed the meters show the
real Eleven Rig L/R level: `bridge-macos/erlevels` (built by
`bridge-macos/build.sh` from `driver/ElevenRackBridge/erlevels.c`) reads the
engine's RMS meter from the driver's shared ring and the main process streams
it to the window about 30 times a second. No microphone permission is
involved and nothing is recorded. Without the driver (or with the rack
unplugged) the needle sits at the MAIN output volume and twitches on incoming
MIDI, and the caption under the meters says which mode it is in.

**Settings** (the Settings button) keeps the display choices: **Controls**
(rotary knobs or vertical sliders, same drag / scroll / double-click-to-restore
either way) and **Window size**, plus the captures folder, logs and the two
rig-wide hardware settings.

Implementation: `src/css/studio.css` (every rule scoped to `body.studio`) and
`src/js/studio-ui.js`, which builds the layout by *moving* the existing
elements into new containers, so every id and handler the editor's scripts
rely on is unchanged. Type is Manrope and JetBrains Mono, bundled under the
SIL Open Font License (`src/fonts/`).

## Startup flags

- `/LOGS` — enable session logging.
- `/NOGPU` — force software rendering (for VMs that hit a splash-screen
  white-flash bug; not needed on real hardware).
- `/T<seconds>` — widen the startup timers (connect gate + firmware check)
  for a slow machine, e.g. `/T30`.

On macOS the same flags take the Unix form — `--logs`, `--nogpu`, `--t30` —
passed from Terminal as `open -a "Eleven Edit" --args --logs`. Session logs
land in `~/Library/Application Support/eleven-edit/logs/`.

## Safety / disclaimer

Free to use and share under the MIT License, with **no warranty, express or
implied — use at your own risk.** Always back up your unit before loading new
banks. The author is not responsible for lost patches, corrupted banks, or gear
that mysteriously starts playing better than you can.

## Acknowledgments

Eleven Edit was written independently, from scratch — no third-party source code
is included or reused. The Eleven Rack USB/MIDI (SysEx) protocol was re-derived
here through direct packet analysis; no Avid software, firmware, or source code
was used.

The SysEx protocol map builds on, and gratefully acknowledges, the earlier
reverse-engineering work of **Guillaume Schmid — [ElevenHack](https://sites.google.com/site/elevenhack/)
(released 2013; open-sourced 2020 under the Apache License 2.0)**. ElevenHack
was consulted as conceptual reference only — it was the clue that Java's
`javax.sound.midi` exposes the Eleven Rack's Vendor-Specific transport that
Windows otherwise hides. None of its code was copied or ported.

If you build on Eleven Edit, please keep **Charles Wardick** and **Guillaume
Schmid** named in your credits, passing the courtesy forward. (A request, not a
license condition.)

See [`NOTICE`](NOTICE) for the full acknowledgment.

## License

[MIT](LICENSE) © 2026 Charles Wardick

---

*Eleven Rack is a trademark of its respective owner. Eleven Edit is an
independent, unofficial project and is not affiliated with or endorsed by Avid.*

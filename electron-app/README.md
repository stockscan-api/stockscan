# StockScan Desktop Application

Electron wrapper for the StockScan web portal. Provides a native desktop experience with system tray integration, auto-updates, and first-run server configuration.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn**
- For Windows builds: Windows 10/11 or a CI environment with Windows runner
- For macOS builds: macOS or CI with macOS runner (code signing requires Apple Developer cert)

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for Windows
npm run build:win

# Build for all platforms
npm run build:all
```

## Project Structure

```
electron-app/
├── main.js              # Main process - window management, tray, menu
├── preload.js           # Preload script - secure IPC bridge
├── wizard.html          # First-run setup wizard UI
├── package.json         # Dependencies + electron-builder config
├── assets/
│   ├── icon.ico         # Windows icon (256x256 multi-size)
│   ├── icon.icns        # macOS icon
│   └── icon.png         # Linux icon (512x512)
└── README.md
```

## How It Works

### First-Run Wizard
On first launch, a setup wizard appears letting users choose:
- **StockScan Cloud (SaaS)** — Pre-configured, connects to `api.stockscan.uk`
- **Enterprise Server** — User enters their self-hosted API URL

The wizard includes a "Test Connection" button and stores the configuration in `electron-store` (persisted to `%APPDATA%/stockscan-desktop/config.json`).

### Server Connection
The desktop app injects the server configuration into `localStorage` when the portal loads, which the web app’s `ServerConnectionContext` picks up automatically. This means:
- The same web portal code runs in both browser and desktop
- Server settings from the wizard are automatically applied
- Users can also change servers via Settings → Server tab in the portal

### System Tray
The app minimizes to the system tray on close (instead of quitting). The tray menu provides quick access to Dashboard, POS, and Quit.

### Auto-Updates
Uses `electron-updater` with a generic provider. Set the `publish.url` in `package.json` to your release server.

## Building the Installer

### Windows (.exe / NSIS installer)
```bash
npm run build:win
```
Outputs to `dist/` directory:
- `StockScan Setup 1.0.0.exe` — NSIS installer
- `StockScan 1.0.0.exe` — Portable executable

### macOS (.dmg)
```bash
npm run build:mac
```
Note: Code signing requires `CSC_LINK` and `CSC_KEY_PASSWORD` environment variables.

### Linux (.AppImage / .deb)
```bash
npm run build:linux
```

## Icons

Before building, place your app icons in the `assets/` directory:
- `icon.ico` — Windows (256x256 multi-resolution ICO)
- `icon.icns` — macOS (use `iconutil` to create from iconset)
- `icon.png` — Linux (512x512 PNG)

You can generate these from the StockScan logo using:
```bash
# From the project root
convert ../nextjs_space/public/logo.png -resize 512x512 assets/icon.png
convert ../nextjs_space/public/logo.png -resize 256x256 assets/icon.ico
# For macOS icns, use iconutil on macOS
```

## Configuration Storage

Settings are stored via `electron-store` at:
- **Windows**: `%APPDATA%/stockscan-desktop/config.json`
- **macOS**: `~/Library/Application Support/stockscan-desktop/config.json`
- **Linux**: `~/.config/stockscan-desktop/config.json`

## CI/CD Integration

For automated builds, use GitHub Actions with `electron-builder`:

```yaml
# .github/workflows/build.yml
name: Build Desktop App
on:
  push:
    tags: ['v*']
jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build:${{ matrix.os == 'windows-latest' && 'win' || matrix.os == 'macos-latest' && 'mac' || 'linux' }}
      - uses: actions/upload-artifact@v4
        with:
          name: desktop-${{ matrix.os }}
          path: dist/*
```

## Version Matching

Keep the desktop app version in sync with the web portal. Update `version` in `package.json` before each release.

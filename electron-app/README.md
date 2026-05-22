# StockScan Desktop Application

Native desktop wrapper for the StockScan web portal, built with Electron.

## Features

- **Native installer** — Windows `.exe` with Start Menu & Desktop shortcuts
- **Setup wizard** — First-run configuration for SaaS or Enterprise mode
- **Enterprise support** — Connect to self-hosted StockScan servers
- **System tray** — Minimize to tray, quick access
- **Auto-updates** — Built-in update mechanism via GitHub Releases
- **Offline error handling** — Friendly error page when connection drops

## Quick Start (Development)

```bash
cd electron-app
npm install
npm start
```

## Building the Installer

### Unsigned Build (for testing)

```bash
npm run build:win:unsigned
```

Output: `dist/StockScan-Setup-1.0.0.exe`

### Signed Build (for distribution)

See [CODE_SIGNING.md](./CODE_SIGNING.md) for full instructions on:
1. Getting a code signing certificate
2. Configuring GitHub Actions for automated builds
3. Building locally with signing

### Automated Builds via GitHub Actions

Push the `electron-app/` folder to a GitHub repo and:

```bash
# Tag a release to trigger automated build
git tag v1.0.0
git push origin v1.0.0
```

Or use manual dispatch from the Actions tab.

## Project Structure

```
electron-app/
├── main.js              # Electron main process
├── preload.js           # Preload script (context bridge)
├── wizard.html          # First-run setup wizard
├── error.html           # Connection error page
├── package.json         # Dependencies & electron-builder config
├── CODE_SIGNING.md      # Code signing certificate guide
├── assets/
│   ├── icon.ico         # Windows icon (256x256 multi-size)
│   └── icon.png         # PNG icon (512x512)
└── .github/
    └── workflows/
        └── build-desktop.yml  # CI/CD for building installers
```

## Configuration

The app stores configuration in the system's app data directory:
- **Windows**: `%APPDATA%/stockscan-desktop/config.json`
- **macOS**: `~/Library/Application Support/stockscan-desktop/config.json`
- **Linux**: `~/.config/stockscan-desktop/config.json`

Settings:
| Key | Default | Description |
|---|---|---|
| `serverUrl` | `https://api.stockscan.uk` | Backend API URL |
| `serverLabel` | `StockScan Cloud` | Display name for the server |
| `serverType` | `saas` | `saas` or `enterprise` |
| `portalUrl` | `https://login.stockscan.uk` | Web portal URL to load |

## Enterprise Mode

For self-hosted deployments:
1. Run the setup wizard (first launch or Help → Run Setup Wizard)
2. Select "Enterprise / Self-Hosted"
3. Enter your server's API URL and Web Portal URL
4. Test the connection and save

## Updating the Version

1. Update `version` in `package.json`
2. Commit and tag:
   ```bash
   git add -A
   git commit -m "Release v1.1.0"
   git tag v1.1.0
   git push origin main --tags
   ```
3. GitHub Actions will build and create a release automatically

const { app, BrowserWindow, Menu, Tray, nativeImage, shell, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Persistent config store
const store = new Store({
  defaults: {
    serverUrl: 'https://api.stockscan.uk',
    serverLabel: 'StockScan Cloud',
    serverType: 'saas',    // 'saas' | 'enterprise'
    portalUrl: 'https://login.stockscan.uk',
    windowBounds: { width: 1280, height: 800 },
    isFirstRun: true,
  },
});

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Enable DevTools shortcut in production
const enableDevTools = (win) => {
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      win.webContents.toggleDevTools();
    }
  });
};

// ──────────────────────────────────────────────
// First-Run Setup Wizard
// ──────────────────────────────────────────────
function showSetupWizard() {
  return new Promise((resolve) => {
    const wizard = new BrowserWindow({
      width: 600,
      height: 520,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      title: 'StockScan Setup',
      icon: getIconPath(),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    wizard.setMenuBarVisibility(false);
    enableDevTools(wizard);

    // Use absolute path for wizard.html — critical for packaged app
    const wizardPath = path.join(__dirname, 'wizard.html');
    console.log('[StockScan] Loading wizard from:', wizardPath);
    wizard.loadFile(wizardPath);

    // Handle wizard load errors
    wizard.webContents.on('did-fail-load', (event, errorCode, errorDesc, validatedURL) => {
      console.error('[StockScan] Wizard failed to load:', errorCode, errorDesc, validatedURL);
    });

    // Listen for wizard completion via IPC

    const handleWizardComplete = (event, config) => {
      store.set('serverUrl', config.serverUrl);
      store.set('serverLabel', config.serverLabel);
      store.set('serverType', config.serverType);
      store.set('portalUrl', config.portalUrl || 'https://login.stockscan.uk');
      store.set('isFirstRun', false);
      wizard.close();
      resolve(config);
    };

    const handleWizardTestConnection = async (event, url) => {
      try {
        const { net } = require('electron');
        const startTime = Date.now();
        const request = net.request(`${url.replace(/\/+$/, '')}/api/health`);
        
        request.on('response', (response) => {
          let body = '';
          response.on('data', (chunk) => { body += chunk.toString(); });
          response.on('end', () => {
            const responseTime = Date.now() - startTime;
            try {
              const data = JSON.parse(body);
              event.reply('wizard-test-result', { success: true, responseTime, data });
            } catch {
              event.reply('wizard-test-result', { success: true, responseTime });
            }
          });
        });
        
        request.on('error', (err) => {
          event.reply('wizard-test-result', { success: false, error: err.message });
        });
        
        request.end();
      } catch (err) {
        event.reply('wizard-test-result', { success: false, error: err.message });
      }
    };

    ipcMain.once('wizard-complete', handleWizardComplete);
    ipcMain.on('wizard-test-connection', handleWizardTestConnection);

    wizard.on('closed', () => {
      ipcMain.removeListener('wizard-complete', handleWizardComplete);
      ipcMain.removeAllListeners('wizard-test-connection');
      resolve(null); // User closed without finishing
    });
  });
}

// ──────────────────────────────────────────────
// Main Application Window
// ──────────────────────────────────────────────
function createMainWindow() {
  const bounds = store.get('windowBounds');
  const portalUrl = store.get('portalUrl');
  const serverUrl = store.get('serverUrl');
  const serverLabel = store.get('serverLabel');
  const serverType = store.get('serverType');

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: 1024,
    minHeight: 600,
    title: 'StockScan',
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
    show: false, // Show after ready-to-show
  });

  // Inject server connection into localStorage before loading
  // Use JSON.stringify for safe escaping (handles quotes, apostrophes, special chars)
  mainWindow.webContents.on('did-finish-load', () => {
    const safeServerUrl = JSON.stringify(serverUrl);
    const safeServerLabel = JSON.stringify(serverLabel);
    const safeServerType = JSON.stringify(serverType);
    mainWindow.webContents.executeJavaScript(`
      try {
        localStorage.setItem('stockscan_server_url', ${safeServerUrl});
        localStorage.setItem('stockscan_server_label', ${safeServerLabel});
        localStorage.setItem('stockscan_server_type', ${safeServerType});
        console.log('[StockScan] Server config injected into localStorage');
      } catch(e) {
        console.error('[StockScan] Failed to set localStorage:', e);
      }
    `);
  });

  enableDevTools(mainWindow);

  console.log('[StockScan] Loading portal URL:', portalUrl);
  mainWindow.loadURL(portalUrl);

  // Handle load failures (network error, DNS, etc.)
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDesc, validatedURL) => {
    console.error('[StockScan] Failed to load portal:', errorCode, errorDesc, validatedURL);
    mainWindow.webContents.loadURL(`data:text/html,
      <html>
      <body style="font-family:system-ui;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;text-align:center;padding:40px;">
        <h1 style="font-size:24px;margin-bottom:12px;">Unable to Connect</h1>
        <p style="color:#94a3b8;margin-bottom:8px;">Could not reach <strong>${portalUrl.replace(/'/g, '&#39;')}</strong></p>
        <p style="color:#64748b;font-size:14px;">Error: ${errorDesc.replace(/'/g, '&#39;')} (${errorCode})</p>
        <p style="color:#64748b;font-size:14px;margin-top:20px;">Check your internet connection and try again.</p>
        <button onclick="location.href='${portalUrl.replace(/'/g, '&#39;')}'"
                style="margin-top:24px;padding:12px 32px;background:#3b82f6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:600;">
          Retry
        </button>
      </body>
      </html>
    `);
  });

  // Show window once ready, with timeout fallback
  let windowShown = false;
  mainWindow.once('ready-to-show', () => {
    if (!windowShown) {
      windowShown = true;
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Fallback: show window after 10 seconds even if ready-to-show hasn't fired
  setTimeout(() => {
    if (!windowShown && mainWindow && !mainWindow.isDestroyed()) {
      windowShown = true;
      console.warn('[StockScan] Showing window via timeout fallback');
      mainWindow.show();
      mainWindow.focus();
    }
  }, 10000);

  // Save window size on resize
  mainWindow.on('resize', () => {
    const [width, height] = mainWindow.getSize();
    store.set('windowBounds', { width, height });
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http') && !url.includes(new URL(portalUrl).host)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Application menu
  const menuTemplate = [
    {
      label: 'StockScan',
      submenu: [
        {
          label: 'Dashboard',
          click: () => mainWindow.loadURL(`${portalUrl}/dashboard`),
        },
        {
          label: 'Point of Sale',
          click: () => mainWindow.loadURL(`${portalUrl}/pos`),
        },
        {
          label: 'Products',
          click: () => mainWindow.loadURL(`${portalUrl}/products`),
        },
        { type: 'separator' },
        {
          label: 'Server Settings',
          click: () => mainWindow.loadURL(`${portalUrl}/settings`),
        },
        { type: 'separator' },
        {
          label: `Connected to: ${serverLabel}`,
          enabled: false,
        },
        { type: 'separator' },
        {
          label: 'Quit StockScan',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            isQuitting = true;
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About StockScan',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About StockScan',
              message: `StockScan Desktop v${app.getVersion()}`,
              detail: `Server: ${serverLabel}\nURL: ${serverUrl}\nType: ${serverType === 'enterprise' ? 'Enterprise' : 'SaaS Cloud'}`,
            });
          },
        },
        {
          label: 'Check for Updates',
          click: () => {
            const { autoUpdater } = require('electron-updater');
            autoUpdater.checkForUpdatesAndNotify();
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  return mainWindow;
}

// ──────────────────────────────────────────────
// System Tray
// ──────────────────────────────────────────────
function createTray() {
  const iconPath = getIconPath();
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open StockScan',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Dashboard',
      click: () => {
        const portalUrl = store.get('portalUrl');
        if (mainWindow) {
          mainWindow.loadURL(`${portalUrl}/dashboard`);
          mainWindow.show();
        }
      },
    },
    {
      label: 'Point of Sale',
      click: () => {
        const portalUrl = store.get('portalUrl');
        if (mainWindow) {
          mainWindow.loadURL(`${portalUrl}/pos`);
          mainWindow.show();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('StockScan - Inventory Management');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function getIconPath() {
  const ext = process.platform === 'win32' ? 'ico' : 'png';
  return path.join(__dirname, 'assets', `icon.${ext}`);
}

// ──────────────────────────────────────────────
// App Lifecycle
// ──────────────────────────────────────────────
app.whenReady().then(async () => {
  // Register IPC handlers
  ipcMain.handle('get-version', () => app.getVersion());
  ipcMain.handle('get-config', (event, key) => store.get(key));

  // Show setup wizard on first run
  if (store.get('isFirstRun')) {
    const result = await showSetupWizard();
    if (!result) {
      // User closed wizard without completing
      app.quit();
      return;
    }
  }

  createMainWindow();
  createTray();

  // Auto-updater
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.checkForUpdatesAndNotify();
  } catch (e) {
    console.log('Auto-updater not available:', e.message);
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

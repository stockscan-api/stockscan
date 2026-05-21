const { app, BrowserWindow, Menu, Tray, nativeImage, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Default SaaS portal URL
const DEFAULT_PORTAL_URL = 'https://login.stockscan.uk';

// Persistent config store
const store = new Store({
  defaults: {
    serverUrl: 'https://api.stockscan.uk',
    serverLabel: 'StockScan Cloud',
    serverType: 'saas',    // 'saas' | 'enterprise'
    portalUrl: DEFAULT_PORTAL_URL,  // For enterprise: their local frontend URL
    windowBounds: { width: 1280, height: 800 },
    isFirstRun: true,
  },
});

// Get the portal URL — SaaS always uses cloud, enterprise uses stored URL
function getPortalUrl() {
  const type = store.get('serverType');
  if (type === 'enterprise') {
    return store.get('portalUrl') || DEFAULT_PORTAL_URL;
  }
  return DEFAULT_PORTAL_URL;
}

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Enable DevTools shortcut (F12) in any window
const enableDevTools = (win) => {
  win.webContents.on('before-input-event', (_event, input) => {
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
      width: 620,
      height: 600,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      title: 'StockScan Setup',
      icon: getIconPath(),
      show: true, // Show immediately so user sees something
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    wizard.setMenuBarVisibility(false);
    enableDevTools(wizard);

    // Use absolute path — critical for packaged app
    const wizardPath = path.join(__dirname, 'wizard.html');
    console.log('[StockScan] Loading wizard from:', wizardPath);
    wizard.loadFile(wizardPath);

    wizard.webContents.on('did-fail-load', (_ev, code, desc) => {
      console.error('[StockScan] Wizard failed to load:', code, desc);
    });

    const handleWizardComplete = (_event, config) => {
      store.set('serverUrl', config.serverUrl);
      store.set('serverLabel', config.serverLabel);
      store.set('serverType', config.serverType);
      // For enterprise, store the portal URL (their local frontend)
      if (config.portalUrl) {
        store.set('portalUrl', config.portalUrl);
      } else if (config.serverType === 'saas') {
        store.set('portalUrl', DEFAULT_PORTAL_URL);
      }
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
    show: false, // Show after ready-to-show or timeout
  });

  // ── localStorage injection ──
  // ONLY inject when we are on the actual portal domain, NOT on error/data/file pages
  mainWindow.webContents.on('did-finish-load', () => {
    const currentUrl = mainWindow.webContents.getURL();
    // Skip injection for non-http pages (data: urls, file: urls, error pages, about:blank)
    if (!currentUrl.startsWith('http://') && !currentUrl.startsWith('https://')) {
      console.log('[StockScan] Skipping localStorage injection for:', currentUrl.substring(0, 50));
      return;
    }
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
    `).catch(() => {}); // Swallow if page navigated away
  });

  enableDevTools(mainWindow);

  console.log('[StockScan] Loading portal URL:', getPortalUrl());
  mainWindow.loadURL(getPortalUrl());

  // ── Handle load failures — show a local error.html file instead of data: URL ──
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc, validatedURL) => {
    console.error('[StockScan] Failed to load portal:', errorCode, errorDesc, validatedURL);
    // Load the bundled error page
    mainWindow.loadFile(path.join(__dirname, 'error.html'));
  });

  // ── Show window: ready-to-show + timeout fallback ──
  let windowShown = false;
  const showWindow = () => {
    if (!windowShown && mainWindow && !mainWindow.isDestroyed()) {
      windowShown = true;
      mainWindow.show();
      mainWindow.focus();
    }
  };
  mainWindow.once('ready-to-show', showWindow);
  setTimeout(() => {
    if (!windowShown) {
      console.warn('[StockScan] Showing window via timeout fallback');
      showWindow();
    }
  }, 10000);

  // Save window size on resize
  mainWindow.on('resize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const [width, height] = mainWindow.getSize();
      store.set('windowBounds', { width, height });
    }
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
    try {
      if (url.startsWith('http') && !url.includes(new URL(getPortalUrl()).host)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    } catch (e) {
      console.error('[StockScan] URL handler error:', e);
    }
    return { action: 'allow' };
  });

  // ── Application menu ──
  const menuTemplate = [
    {
      label: 'StockScan',
      submenu: [
        {
          label: 'Dashboard',
          click: () => mainWindow.loadURL(`${getPortalUrl()}/dashboard`),
        },
        {
          label: 'Point of Sale',
          click: () => mainWindow.loadURL(`${getPortalUrl()}/pos`),
        },
        {
          label: 'Products',
          click: () => mainWindow.loadURL(`${getPortalUrl()}/products`),
        },
        { type: 'separator' },
        {
          label: 'Server Settings',
          click: () => mainWindow.loadURL(`${getPortalUrl()}/settings`),
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
          label: 'Run Setup Wizard...',
          click: async () => {
            // Re-run setup wizard from the menu
            store.set('isFirstRun', true);
            if (mainWindow) {
              mainWindow.hide();
            }
            const result = await showSetupWizard();
            if (result) {
              // Reload with new config
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.loadURL(getPortalUrl());
                mainWindow.show();
              } else {
                createMainWindow();
              }
            } else if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.show();
            }
          },
        },
        {
          label: 'Reset All Settings',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'warning',
              title: 'Reset Settings',
              message: 'Reset all StockScan settings?',
              detail: 'This will clear your server configuration and show the setup wizard on next launch.',
              buttons: ['Cancel', 'Reset'],
              defaultId: 0,
              cancelId: 0,
            }).then(({ response }) => {
              if (response === 1) {
                store.clear();
                app.relaunch();
                app.exit(0);
              }
            });
          },
        },
        { type: 'separator' },
        {
          label: 'About StockScan',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About StockScan',
              message: `StockScan Desktop v${app.getVersion()}`,
              detail: `Server: ${serverLabel}\nURL: ${serverUrl}\nType: ${serverType === 'enterprise' ? 'Enterprise' : 'SaaS Cloud'}\n\nConfig location: ${store.path}`,
            });
          },
        },
        {
          label: 'Check for Updates',
          click: () => {
            try {
              const { autoUpdater } = require('electron-updater');
              autoUpdater.checkForUpdatesAndNotify();
            } catch (e) {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Updates',
                message: 'Auto-updater not available in this build.',
              });
            }
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
        
        if (mainWindow) {
          mainWindow.loadURL(`${getPortalUrl()}/dashboard`);
          mainWindow.show();
        }
      },
    },
    {
      label: 'Point of Sale',
      click: () => {
        
        if (mainWindow) {
          mainWindow.loadURL(`${getPortalUrl()}/pos`);
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
  ipcMain.handle('get-config', (_event, key) => store.get(key));

  // Show setup wizard on first run
  if (store.get('isFirstRun')) {
    const result = await showSetupWizard();
    if (!result) {
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
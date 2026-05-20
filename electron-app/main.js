const { app, BrowserWindow, Menu, Tray, nativeImage, shell } = require('electron');
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
    wizard.loadFile('wizard.html');

    // Listen for wizard completion via IPC
    const { ipcMain } = require('electron');

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
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      localStorage.setItem('stockscan_server_url', '${serverUrl}');
      localStorage.setItem('stockscan_server_label', '${serverLabel}');
      localStorage.setItem('stockscan_server_type', '${serverType}');
    `);
  });

  mainWindow.loadURL(portalUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

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

const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC methods to the wizard renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Wizard methods
  completeSetup: (config) => ipcRenderer.send('wizard-complete', config),
  testConnection: (url) => ipcRenderer.send('wizard-test-connection', url),
  onTestResult: (callback) => ipcRenderer.on('wizard-test-result', (event, result) => callback(result)),
  
  // App info
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // Store access (read-only from renderer)
  getConfig: (key) => ipcRenderer.invoke('get-config', key),
});

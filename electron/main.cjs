const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
const VAULT_DIR = path.join(app.getPath('userData'), 'fluid-vault');

function ensureVaultDir() {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'Fluid Circuit Studio',
    icon: path.join(__dirname, '..', 'public', 'app-logo.png'),
    backgroundColor: '#0B0F17',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const loadLatestBundle = async () => {
    try {
      const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
      const stampFile = path.join(VAULT_DIR, '.bundle-stamp');
      if (fs.existsSync(distIndex)) {
        const currentStamp = String(fs.statSync(distIndex).mtimeMs);
        const prevStamp = fs.existsSync(stampFile) ? fs.readFileSync(stampFile, 'utf8') : '';
        if (currentStamp !== prevStamp) {
          await win.webContents.session.clearCache();
          ensureVaultDir();
          fs.writeFileSync(stampFile, currentStamp, 'utf8');
        }
      }
    } catch (err) {
      console.error('Auto-update cache check skipped:', err);
    }

    if (isDev && process.env.ELECTRON_START_URL) {
      win.loadURL(process.env.ELECTRON_START_URL);
    } else {
      win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }
  };

  void loadLatestBundle();
}

ipcMain.handle('vault:sync', async (_event, payload) => {
  try {
    ensureVaultDir();
    fs.writeFileSync(
      path.join(VAULT_DIR, 'projects.json'),
      JSON.stringify(payload.projects ?? [], null, 2),
      'utf8'
    );
    fs.writeFileSync(
      path.join(VAULT_DIR, 'audit-logs.json'),
      JSON.stringify(payload.auditLogs ?? [], null, 2),
      'utf8'
    );
    return true;
  } catch (err) {
    console.error('Vault sync error:', err);
    return false;
  }
});

ipcMain.handle('vault:exportFile', async (_event, { filename, content }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Exportar Projeto Fluid Circuit Studio',
    defaultPath: filename || 'circuito.fcproj',
    filters: [{ name: 'Fluid Circuit Project', extensions: ['fcproj', 'json', 'csv'] }],
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
});

app.whenReady().then(() => {
  ensureVaultDir();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

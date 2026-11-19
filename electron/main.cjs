const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const DIST_DIR = path.join(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.webm': 'audio/webm',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const PREFERRED_PORTS = [45917, 45918, 45919, 0];

let localServer = null;
let mainWindow = null;

function startOfflineBundleServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const cleanPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const requested = cleanPath === '/' ? 'index.html' : cleanPath.replace(/^\/+/, '');
      const fullPath = path.normalize(path.join(DIST_DIR, requested));

      if (!fullPath.startsWith(DIST_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      const fileExists = fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
      if (!fileExists && requested.startsWith('audio/')) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      const targetPath = fileExists ? fullPath : path.join(DIST_DIR, 'index.html');

      const ext = path.extname(targetPath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(targetPath).pipe(res);
    });

    let portIdx = 0;
    const tryListen = () => {
      const port = PREFERRED_PORTS[portIdx] ?? 0;
      server.listen(port, '127.0.0.1');
    };

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE' && portIdx < PREFERRED_PORTS.length - 1) {
        portIdx += 1;
        tryListen();
        return;
      }
      reject(err);
    });

    server.on('listening', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        localServer = server;
        resolve(`http://127.0.0.1:${addr.port}/`);
      } else {
        reject(new Error('No se pudo abrir el servidor local offline.'));
      }
    });

    tryListen();
  });
}

async function createWindow() {
  Menu.setApplicationMenu(null);
  const entryUrl = await startOfflineBundleServer();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 900,
    minHeight: 560,
    title: 'RUTA CATRACHA — Creado por Isaac Ramos',
    backgroundColor: '#070d16',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await mainWindow.loadURL(entryUrl);
}

ipcMain.on('ruta-catracha-toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

app.whenReady().then(() => {
  void createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (localServer) {
    localServer.close();
    localServer = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

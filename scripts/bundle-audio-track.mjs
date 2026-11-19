#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_AUDIO_DIR = path.join(ROOT_DIR, 'public', 'audio');
const REGISTRY_FILE = path.join(ROOT_DIR, 'src', 'audio', 'bundledAudioRegistry.ts');

const SUPPORTED_EXT_MIME = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.webm': 'audio/webm',
};

const BASE_ASSET_NAME = 'todas_las_noches_estuvo';

function writeRegistry({
  publicPath = '/audio/todas_las_noches_estuvo.mp3',
  fileName = null,
  mimeType = null,
  byteSize = 0,
  bundled = false,
  bundledAt = null,
}) {
  const content = `export interface BundledTrackEntry {
  id: 'todas_las_noches_estuvo';
  title: string;
  artist: string;
  styleLabel: string;
  publicPath: string;
  fileName: string | null;
  mimeType: string | null;
  byteSize: number;
  bundled: boolean;
  bundledAt: string | null;
}

export const BUNDLED_TRACK_REGISTRY: Record<'todas_las_noches_estuvo', BundledTrackEntry> = {
  todas_las_noches_estuvo: {
    id: 'todas_las_noches_estuvo',
    title: 'Todas las noches estuvo',
    artist: 'KBP',
    styleLabel: 'Raspe Catracho',
    publicPath: ${JSON.stringify(publicPath)},
    fileName: ${JSON.stringify(fileName)},
    mimeType: ${JSON.stringify(mimeType)},
    byteSize: ${byteSize},
    bundled: ${bundled},
    bundledAt: ${JSON.stringify(bundledAt)},
  },
};
`;
  fs.mkdirSync(path.dirname(REGISTRY_FILE), { recursive: true });
  fs.writeFileSync(REGISTRY_FILE, content, 'utf8');
}

function removeExistingBundledFiles() {
  if (!fs.existsSync(PUBLIC_AUDIO_DIR)) return;
  for (const entry of fs.readdirSync(PUBLIC_AUDIO_DIR)) {
    const ext = path.extname(entry).toLowerCase();
    const stem = path.basename(entry, ext);
    if (stem === BASE_ASSET_NAME && ext in SUPPORTED_EXT_MIME) {
      fs.unlinkSync(path.join(PUBLIC_AUDIO_DIR, entry));
    }
  }
}

function findBundledFile() {
  if (!fs.existsSync(PUBLIC_AUDIO_DIR)) return null;
  for (const entry of fs.readdirSync(PUBLIC_AUDIO_DIR)) {
    const ext = path.extname(entry).toLowerCase();
    const stem = path.basename(entry, ext);
    if (stem === BASE_ASSET_NAME && ext in SUPPORTED_EXT_MIME) {
      const fullPath = path.join(PUBLIC_AUDIO_DIR, entry);
      const stats = fs.statSync(fullPath);
      return { entry, ext, fullPath, stats };
    }
  }
  return null;
}

function autoDiscoverCandidate() {
  const searchDirs = [ROOT_DIR, path.join(ROOT_DIR, 'assets'), path.join(ROOT_DIR, 'src', 'assets')];
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const ext = path.extname(name).toLowerCase();
      if (!(ext in SUPPORTED_EXT_MIME)) continue;
      const lower = name.toLowerCase();
      if (lower.includes('todas') && lower.includes('noches')) {
        return path.join(dir, name);
      }
    }
  }
  return null;
}

function printHelp() {
  console.log(`
RUTA CATRACHA — Audio Asset Bundler ("Todas las noches estuvo")

Uso:
  npm run bundle:audio -- <ruta-al-archivo-de-audio>
  npm run bundle:audio -- --check
  npm run bundle:audio -- --clear

Formatos soportados: ${Object.keys(SUPPORTED_EXT_MIME).join(', ')}

Al ejecutarse con un archivo válido:
  1. Copia y normaliza el archivo en public/audio/todas_las_noches_estuvo.<ext>
  2. Actualiza src/audio/bundledAudioRegistry.ts para que el motor 3D y el PWA offline lo incluyan automáticamente.
`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  if (args.includes('--clear')) {
    removeExistingBundledFiles();
    writeRegistry({ bundled: false });
    console.log('✓ Pista empaquetada eliminada de public/audio/ y registro restablecido.');
    return;
  }

  if (args.includes('--check')) {
    const existing = findBundledFile();
    if (!existing) {
      console.log('ℹ No hay archivo de "Todas las noches estuvo" empaquetado en public/audio/.');
      return;
    }
    writeRegistry({
      publicPath: `/audio/${existing.entry}`,
      fileName: existing.entry,
      mimeType: SUPPORTED_EXT_MIME[existing.ext],
      byteSize: existing.stats.size,
      bundled: true,
      bundledAt: new Date().toISOString(),
    });
    console.log(
      `✓ Pista detectada: public/audio/${existing.entry} (${(existing.stats.size / (1024 * 1024)).toFixed(2)} MB)`,
    );
    return;
  }

  const fileFlagIdx = args.findIndex((a) => a === '--file' || a === '-f');
  const rawInputPath =
    fileFlagIdx >= 0 ? args[fileFlagIdx + 1] : args.find((a) => !a.startsWith('-')) ?? autoDiscoverCandidate();

  if (!rawInputPath) {
    printHelp();
    console.error('✗ Debes indicar la ruta de tu archivo de audio (ej. "Todas las noches estuvo.mp3").');
    process.exitCode = 1;
    return;
  }

  const resolvedSource = path.resolve(process.cwd(), rawInputPath);
  if (!fs.existsSync(resolvedSource)) {
    console.error(`✗ No se encontró el archivo: ${resolvedSource}`);
    process.exitCode = 1;
    return;
  }

  const stats = fs.statSync(resolvedSource);
  if (!stats.isFile() || stats.size === 0) {
    console.error('✗ La ruta indicada no es un archivo de audio válido o está vacío.');
    process.exitCode = 1;
    return;
  }

  const ext = path.extname(resolvedSource).toLowerCase();
  const mimeType = SUPPORTED_EXT_MIME[ext];
  if (!mimeType) {
    console.error(
      `✗ Formato no soportado (${ext || 'sin extensión'}). Usa: ${Object.keys(SUPPORTED_EXT_MIME).join(', ')}`,
    );
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });
  removeExistingBundledFiles();

  const targetName = `${BASE_ASSET_NAME}${ext}`;
  const targetPath = path.join(PUBLIC_AUDIO_DIR, targetName);
  fs.copyFileSync(resolvedSource, targetPath);

  writeRegistry({
    publicPath: `/audio/${targetName}`,
    fileName: path.basename(resolvedSource),
    mimeType,
    byteSize: stats.size,
    bundled: true,
    bundledAt: new Date().toISOString(),
  });

  console.log(`✓ Pista empaquetada correctamente:`);
  console.log(`  Origen : ${resolvedSource}`);
  console.log(`  Destino: public/audio/${targetName}`);
  console.log(`  Tamaño : ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  Estado : Lista para selección en Configuración -> Estilo Musical.`);
}

main();

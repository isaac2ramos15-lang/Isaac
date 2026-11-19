import {
  addTracksToOfflinePlaylist,
  clearAuthorizedTrack,
  listOfflinePlaylistTracks,
  listSongCustomTrackMetas,
  loadOfflineTrackData,
  loadSongCustomTrackData,
  removeOfflinePlaylistTrack,
  removeSongCustomTrack,
  saveSongCustomTrack,
  type OfflineTrackMeta,
  type SongOverrideMeta,
  type StoredAudioTrack,
  type StoredSongOverride,
} from '../services/customAudioStorage';
import { BUNDLED_TRACK_REGISTRY, type BundledTrackEntry } from './bundledAudioRegistry';

export const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm'] as const;
const MAX_LOCAL_AUDIO_BYTES = 45 * 1024 * 1024; // 45 MB per song

export interface TrackBundleResult {
  addedTracks: OfflineTrackMeta[];
  firstTrackData: StoredAudioTrack | null;
}

export function isSupportedAudioFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  const extMatch = SUPPORTED_AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
  const mimeMatch = file.type.startsWith('audio/');
  return extMatch || mimeMatch;
}

export function validateAudioFileForBundle(file: File): string | null {
  if (!isSupportedAudioFile(file)) {
    return `Formato no compatible (${file.name}). Usa: ${SUPPORTED_AUDIO_EXTENSIONS.join(', ')}`;
  }
  if (file.size <= 0) {
    return `El archivo "${file.name}" está vacío.`;
  }
  if (file.size > MAX_LOCAL_AUDIO_BYTES) {
    return `"${file.name}" supera el límite de 45 MB por canción.`;
  }
  return null;
}

/**
 * Empaqueta una o múltiples canciones proporcionadas por el jugador dentro del
 * almacenamiento local persistente sin conexión (IndexedDB).
 */
export async function bundleUserTracksLocally(files: File[]): Promise<TrackBundleResult> {
  if (files.length === 0) {
    throw new Error('No se seleccionaron archivos de audio.');
  }
  for (const file of files) {
    const err = validateAudioFileForBundle(file);
    if (err) throw new Error(err);
  }
  const addedTracks = await addTracksToOfflinePlaylist(files);
  const firstTrackData = addedTracks[0] ? await loadOfflineTrackData(addedTracks[0].id) : null;
  return { addedTracks, firstTrackData };
}

export async function getOfflinePlaylist(): Promise<OfflineTrackMeta[]> {
  return listOfflinePlaylistTracks();
}

export async function getOfflineTrackBuffer(id: string): Promise<StoredAudioTrack | null> {
  return loadOfflineTrackData(id);
}

export async function deleteOfflineTrack(id: string): Promise<void> {
  await removeOfflinePlaylistTrack(id);
}

export async function clearOfflinePlaylist(): Promise<void> {
  await clearAuthorizedTrack();
}

export async function saveSongOverrideLocally(
  songId: string,
  file: File,
): Promise<StoredSongOverride> {
  const err = validateAudioFileForBundle(file);
  if (err) throw new Error(err);
  return saveSongCustomTrack(songId, file);
}

export async function getSongOverrideMetas(): Promise<Record<string, SongOverrideMeta>> {
  return listSongCustomTrackMetas();
}

export async function getSongOverrideBuffer(songId: string): Promise<StoredSongOverride | null> {
  return loadSongCustomTrackData(songId);
}

export async function deleteSongOverride(songId: string): Promise<void> {
  await removeSongCustomTrack(songId);
}

export function getBundledTrackMetadata(
  id: keyof typeof BUNDLED_TRACK_REGISTRY = 'todas_las_noches_estuvo',
): BundledTrackEntry {
  return BUNDLED_TRACK_REGISTRY[id];
}

/**
 * Obtiene el ArrayBuffer de un archivo de audio empaquetado en /public/audio/
 * verificando que el servidor no devuelva el index.html de respaldo del SPA.
 */
export async function fetchBundledAssetBuffer(
  id: keyof typeof BUNDLED_TRACK_REGISTRY = 'todas_las_noches_estuvo',
): Promise<{ data: ArrayBuffer; publicPath: string; fileName: string } | null> {
  const entry = BUNDLED_TRACK_REGISTRY[id];
  const candidatePaths = entry.bundled
    ? [entry.publicPath]
    : [
        '/audio/todas_las_noches_estuvo.mp3',
        '/audio/todas_las_noches_estuvo.ogg',
        '/audio/todas_las_noches_estuvo.wav',
        '/audio/todas_las_noches_estuvo.m4a',
      ];

  for (const url of candidatePaths) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('text/html') || contentType.includes('application/javascript')) {
        continue;
      }
      const data = await res.arrayBuffer();
      if (data.byteLength < 256) continue;
      const fileName = entry.fileName || url.split('/').pop() || 'todas_las_noches_estuvo.mp3';
      return { data, publicPath: url, fileName };
    } catch {
      // Try next candidate
    }
  }
  return null;
}

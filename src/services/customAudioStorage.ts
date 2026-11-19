const DB_NAME = 'ruta_catracha_audio_db';
const DB_VERSION = 3;
const LEGACY_STORE_NAME = 'authorized_tracks';
const LEGACY_TRACK_KEY = 'primary_authorized_track';
const PLAYLIST_STORE_NAME = 'playlist_tracks';
const SONG_OVERRIDES_STORE_NAME = 'song_overrides';

export interface StoredAudioTrack {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  data: ArrayBuffer;
  savedAt: number;
}

export interface OfflineTrackMeta {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  savedAt: number;
}

export interface SongOverrideMeta {
  songId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  savedAt: number;
}

export interface StoredSongOverride extends SongOverrideMeta {
  data: ArrayBuffer;
}

export async function requestPersistentAudioStorage(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      const already = await navigator.storage.persisted();
      if (already) return true;
      return await navigator.storage.persist();
    }
  } catch {
    // Ignore unsupported browsers
  }
  return false;
}

function makeTrackId(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40);
  return `trk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${clean}`;
}

function openAudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LEGACY_STORE_NAME)) {
        db.createObjectStore(LEGACY_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(PLAYLIST_STORE_NAME)) {
        db.createObjectStore(PLAYLIST_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SONG_OVERRIDES_STORE_NAME)) {
        db.createObjectStore(SONG_OVERRIDES_STORE_NAME, { keyPath: 'songId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function migrateLegacyTrackIfNeeded(db: IDBDatabase): Promise<void> {
  try {
    if (!db.objectStoreNames.contains(LEGACY_STORE_NAME)) return;
    const legacy = await new Promise<{
      name: string;
      mimeType: string;
      data: ArrayBuffer;
      savedAt: number;
    } | null>((resolve) => {
      const tx = db.transaction(LEGACY_STORE_NAME, 'readonly');
      const req = tx.objectStore(LEGACY_STORE_NAME).get(LEGACY_TRACK_KEY);
      req.onsuccess = () =>
        resolve(
          (req.result as { name: string; mimeType: string; data: ArrayBuffer; savedAt: number } | undefined) ??
            null,
        );
      req.onerror = () => resolve(null);
    });
    if (!legacy) return;

    const existingCount = await new Promise<number>((resolve) => {
      const tx = db.transaction(PLAYLIST_STORE_NAME, 'readonly');
      const req = tx.objectStore(PLAYLIST_STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });

    if (existingCount === 0) {
      const migrated: StoredAudioTrack = {
        id: makeTrackId(legacy.name),
        name: legacy.name,
        mimeType: legacy.mimeType || 'audio/mpeg',
        sizeBytes: legacy.data.byteLength,
        data: legacy.data,
        savedAt: legacy.savedAt || Date.now(),
      };
      await new Promise<void>((resolve) => {
        const tx = db.transaction([PLAYLIST_STORE_NAME, LEGACY_STORE_NAME], 'readwrite');
        tx.objectStore(PLAYLIST_STORE_NAME).put(migrated);
        tx.objectStore(LEGACY_STORE_NAME).delete(LEGACY_TRACK_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch {
    // Ignore migration issues cleanly
  }
}

export async function addTracksToOfflinePlaylist(files: File[]): Promise<OfflineTrackMeta[]> {
  void requestPersistentAudioStorage();
  const entries: StoredAudioTrack[] = [];
  for (const file of files) {
    const data = await file.arrayBuffer();
    entries.push({
      id: makeTrackId(file.name),
      name: file.name,
      mimeType: file.type || 'audio/mpeg',
      sizeBytes: file.size || data.byteLength,
      data,
      savedAt: Date.now(),
    });
  }

  const db = await openAudioDb();
  await migrateLegacyTrackIfNeeded(db);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PLAYLIST_STORE_NAME, 'readwrite');
    const store = tx.objectStore(PLAYLIST_STORE_NAME);
    for (const entry of entries) {
      store.put(entry);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  return entries.map(({ id, name, mimeType, sizeBytes, savedAt }) => ({
    id,
    name,
    mimeType,
    sizeBytes,
    savedAt,
  }));
}

export async function listOfflinePlaylistTracks(): Promise<OfflineTrackMeta[]> {
  try {
    const db = await openAudioDb();
    await migrateLegacyTrackIfNeeded(db);
    const items = await new Promise<OfflineTrackMeta[]>((resolve, reject) => {
      const tx = db.transaction(PLAYLIST_STORE_NAME, 'readonly');
      const req = tx.objectStore(PLAYLIST_STORE_NAME).getAll();
      req.onsuccess = () => {
        const all = (req.result as StoredAudioTrack[]) || [];
        resolve(
          all
            .map(({ id, name, mimeType, sizeBytes, savedAt }) => ({
              id,
              name,
              mimeType: mimeType || 'audio/mpeg',
              sizeBytes: sizeBytes || 0,
              savedAt: savedAt || 0,
            }))
            .sort((a, b) => a.savedAt - b.savedAt),
        );
      };
      req.onerror = () => reject(req.error);
    });
    db.close();
    return items;
  } catch {
    return [];
  }
}

export async function loadOfflineTrackData(id: string): Promise<StoredAudioTrack | null> {
  try {
    const db = await openAudioDb();
    const res = await new Promise<StoredAudioTrack | null>((resolve, reject) => {
      const tx = db.transaction(PLAYLIST_STORE_NAME, 'readonly');
      const req = tx.objectStore(PLAYLIST_STORE_NAME).get(id);
      req.onsuccess = () => resolve((req.result as StoredAudioTrack | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return res;
  } catch {
    return null;
  }
}

export async function removeOfflinePlaylistTrack(id: string): Promise<void> {
  try {
    const db = await openAudioDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PLAYLIST_STORE_NAME, 'readwrite');
      tx.objectStore(PLAYLIST_STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore storage errors
  }
}

export async function saveAuthorizedTrack(file: File): Promise<StoredAudioTrack> {
  const added = await addTracksToOfflinePlaylist([file]);
  const loaded = await loadOfflineTrackData(added[0].id);
  return (
    loaded ?? {
      ...added[0],
      data: await file.arrayBuffer(),
    }
  );
}

export async function loadAuthorizedTrack(): Promise<StoredAudioTrack | null> {
  const list = await listOfflinePlaylistTracks();
  if (list.length === 0) return null;
  return loadOfflineTrackData(list[0].id);
}

export async function clearAuthorizedTrack(): Promise<void> {
  try {
    const db = await openAudioDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PLAYLIST_STORE_NAME, 'readwrite');
      tx.objectStore(PLAYLIST_STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore storage errors
  }
}

export async function saveSongCustomTrack(
  songId: string,
  file: File,
): Promise<StoredSongOverride> {
  void requestPersistentAudioStorage();
  const data = await file.arrayBuffer();
  const entry: StoredSongOverride = {
    songId,
    name: file.name,
    mimeType: file.type || 'audio/mpeg',
    sizeBytes: file.size || data.byteLength,
    savedAt: Date.now(),
    data,
  };
  const db = await openAudioDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SONG_OVERRIDES_STORE_NAME, 'readwrite');
    tx.objectStore(SONG_OVERRIDES_STORE_NAME).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return entry;
}

export async function listSongCustomTrackMetas(): Promise<Record<string, SongOverrideMeta>> {
  try {
    const db = await openAudioDb();
    const map = await new Promise<Record<string, SongOverrideMeta>>((resolve) => {
      const tx = db.transaction(SONG_OVERRIDES_STORE_NAME, 'readonly');
      const req = tx.objectStore(SONG_OVERRIDES_STORE_NAME).getAll();
      req.onsuccess = () => {
        const list = (req.result as StoredSongOverride[]) || [];
        const out: Record<string, SongOverrideMeta> = {};
        for (const item of list) {
          out[item.songId] = {
            songId: item.songId,
            name: item.name,
            mimeType: item.mimeType || 'audio/mpeg',
            sizeBytes: item.sizeBytes || 0,
            savedAt: item.savedAt || 0,
          };
        }
        resolve(out);
      };
      req.onerror = () => resolve({});
    });
    db.close();
    return map;
  } catch {
    return {};
  }
}

export async function loadSongCustomTrackData(songId: string): Promise<StoredSongOverride | null> {
  try {
    const db = await openAudioDb();
    const item = await new Promise<StoredSongOverride | null>((resolve) => {
      const tx = db.transaction(SONG_OVERRIDES_STORE_NAME, 'readonly');
      const req = tx.objectStore(SONG_OVERRIDES_STORE_NAME).get(songId);
      req.onsuccess = () => resolve((req.result as StoredSongOverride | undefined) ?? null);
      req.onerror = () => resolve(null);
    });
    db.close();
    return item;
  } catch {
    return null;
  }
}

export async function removeSongCustomTrack(songId: string): Promise<void> {
  try {
    const db = await openAudioDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(SONG_OVERRIDES_STORE_NAME, 'readwrite');
      tx.objectStore(SONG_OVERRIDES_STORE_NAME).delete(songId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    // Ignore storage errors
  }
}

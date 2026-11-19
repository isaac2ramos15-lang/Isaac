import type { OfflineTrackMeta, SongOverrideMeta } from '../services/customAudioStorage';
import type { MusicStyle } from '../types/game';
import type { MusicContext } from './audioManifest';
import { BUNDLED_TRACK_REGISTRY } from './bundledAudioRegistry';
import {
  fetchBundledAssetBuffer,
  getOfflineTrackBuffer,
  getSongOverrideBuffer,
} from './trackBundler';

export interface MusicPlaybackSnapshot {
  isPlaying: boolean;
  isPausedByUser: boolean;
  musicStyle: MusicStyle;
  activeTrackId: string | null;
  activeTrackTitle: string;
  activeTrackIndex: number;
  playlistCount: number;
  hasCustomAudio: boolean;
}

export const SONG_CATALOG_META: {
  id: Exclude<
    MusicStyle,
    'mi_musica' | 'raspe' | 'punta' | 'rap' | 'tropical' | 'urbana' | 'cinematica'
  >;
  title: string;
  subtitle: string;
}[] = [
  {
    id: 'todas_las_noches_estuvo',
    title: 'Todas las noches estuvo',
    subtitle: 'Raspe Catracho · KBP',
  },
  {
    id: 'sopa_de_caracol',
    title: 'Sopa de Caracol',
    subtitle: 'Punta Garífuna Festiva',
  },
  {
    id: 'tegucigalpa_noche',
    title: 'Noches de Tegucigalpa',
    subtitle: 'Cumbia & Raspe Capitalino',
  },
  {
    id: 'brisa_la_ceiba',
    title: 'Brisa de La Ceiba',
    subtitle: 'Carnaval Caribeño',
  },
  {
    id: 'orgullo_catracho',
    title: 'Orgullo Catracho (504)',
    subtitle: 'Urbano / Hip-Hop Nacional',
  },
  {
    id: 'vuelo_guacamaya',
    title: 'Vuelo de Guacamaya',
    subtitle: 'Marimba & Folclore de Copán',
  },
];

const STYLE_LABELS: Record<MusicStyle, string> = {
  mi_musica: 'Mi Música Offline',
  todas_las_noches_estuvo: 'Todas las noches estuvo',
  sopa_de_caracol: 'Sopa de Caracol',
  tegucigalpa_noche: 'Noches de Tegucigalpa',
  brisa_la_ceiba: 'Brisa de La Ceiba',
  orgullo_catracho: 'Orgullo Catracho (504)',
  vuelo_guacamaya: 'Vuelo de Guacamaya',
  raspe: 'Raspe Catracho',
  punta: 'Punta',
  rap: 'Rap',
  tropical: 'Tropical',
  urbana: 'Urbana',
  cinematica: 'Cinemática',
};

const BUILTIN_CYCLE_ORDER: MusicStyle[] = [
  'todas_las_noches_estuvo',
  'sopa_de_caracol',
  'tegucigalpa_noche',
  'brisa_la_ceiba',
  'orgullo_catracho',
  'vuelo_guacamaya',
  'raspe',
  'punta',
  'rap',
  'tropical',
  'urbana',
  'cinematica',
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private musicVolume = 0.72;
  private sfxVolume = 0.88;
  private ambientVolume = 0.55;
  private vehicleVolume = 0.78;
  private musicStyle: MusicStyle = 'raspe';
  private musicContext: MusicContext = 'menu';

  private musicMasterGain: GainNode | null = null;
  private ambientMasterGain: GainNode | null = null;
  private activeMusicSource: AudioBufferSourceNode | null = null;
  private activeAmbientSource: AudioBufferSourceNode | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private ambientBuffer: AudioBuffer | null = null;

  // Bundled special track ("Todas las noches estuvo")
  private bundledSpecialRaw: ArrayBuffer | null = null;
  private bundledSpecialBuffer: AudioBuffer | null = null;
  private bundledFetchAttempted = false;
  private bundledFetchPromise: Promise<boolean> | null = null;

  // Multi-song offline playlist imported by the user
  private playlistMetas: OfflineTrackMeta[] = [];
  private activePlaylistIndex = 0;
  private playlistBuffers = new Map<string, AudioBuffer>();
  private playlistRaw = new Map<string, { data: ArrayBuffer; mimeType: string }>();
  private loadingTrackId: string | null = null;

  // Per-song user-uploaded track overrides ("Yo subo la pista")
  private songOverrideMetas: Record<string, SongOverrideMeta> = {};
  private songOverrideBuffers = new Map<string, AudioBuffer>();
  private songOverrideRaw = new Map<string, { data: ArrayBuffer; mimeType: string }>();
  private loadingOverrideId: string | null = null;

  // HTMLAudioElement fallback from local IndexedDB Blob (plays any format offline even if decodeAudioData fails)
  private activeHtmlAudio: HTMLAudioElement | null = null;
  private activeHtmlAudioUrl: string | null = null;

  // Transport state (Play / Pause / Resume / Offset)
  private isPausedByUser = false;
  private manualStopGuard = false;
  private trackStartCtxTime = 0;
  private trackPauseOffsetSec = 0;
  private listeners = new Set<(snap: MusicPlaybackSnapshot) => void>();
  private styleChangeCallback: ((style: MusicStyle) => void) | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.musicMasterGain = this.ctx.createGain();
      this.musicMasterGain.gain.value = this.muted ? 0 : this.musicVolume * 0.45;
      this.musicMasterGain.connect(this.ctx.destination);

      this.ambientMasterGain = this.ctx.createGain();
      this.ambientMasterGain.gain.value = this.muted ? 0 : this.ambientVolume * 0.25;
      this.ambientMasterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setStyleChangeHandler(cb: ((style: MusicStyle) => void) | null): void {
    this.styleChangeCallback = cb;
  }

  public subscribePlaybackState(listener: (snap: MusicPlaybackSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getPlaybackSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getPlaybackSnapshot(): MusicPlaybackSnapshot {
    const activeMeta = this.playlistMetas[this.activePlaylistIndex] ?? null;
    const overrideMeta = this.songOverrideMetas[this.musicStyle];
    let title = STYLE_LABELS[this.musicStyle];
    let hasCustomAudio = false;

    if (this.musicStyle === 'mi_musica') {
      title = activeMeta ? activeMeta.name.replace(/\.[^/.]+$/, '') : 'Sin canciones cargadas';
      hasCustomAudio = Boolean(activeMeta);
    } else if (overrideMeta) {
      title = `${STYLE_LABELS[this.musicStyle]} · Tu Pista`;
      hasCustomAudio = true;
    } else if (
      this.musicStyle === 'todas_las_noches_estuvo' &&
      BUNDLED_TRACK_REGISTRY.todas_las_noches_estuvo.bundled
    ) {
      title = 'Todas las noches estuvo · Local';
      hasCustomAudio = true;
    }

    return {
      isPlaying:
        (Boolean(this.activeMusicSource) || Boolean(this.activeHtmlAudio)) &&
        !this.isPausedByUser &&
        !this.muted,
      isPausedByUser: this.isPausedByUser,
      musicStyle: this.musicStyle,
      activeTrackId: this.musicStyle === 'mi_musica' ? activeMeta?.id ?? null : null,
      activeTrackTitle: title,
      activeTrackIndex: this.activePlaylistIndex,
      playlistCount: this.playlistMetas.length,
      hasCustomAudio,
    };
  }

  private emitPlaybackSnapshot(): void {
    const snap = this.getPlaybackSnapshot();
    this.listeners.forEach((cb) => cb(snap));
  }

  public isContextRunning(): boolean {
    return this.ctx?.state === 'running';
  }

  public unlock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (
      this.songOverrideMetas[this.musicStyle] &&
      !this.songOverrideBuffers.has(this.musicStyle) &&
      !this.songOverrideRaw.has(this.musicStyle)
    ) {
      void this.ensureSongOverrideDecoded(this.musicStyle);
    } else if (this.musicStyle === 'todas_las_noches_estuvo' && !this.bundledSpecialBuffer) {
      void this.ensureBundledTrackLoaded();
    } else if (this.musicStyle === 'mi_musica' && this.playlistMetas.length > 0) {
      void this.ensureActivePlaylistTrackDecoded();
    }
    if (!this.activeMusicSource && !this.activeHtmlAudio && !this.muted && !this.isPausedByUser) {
      this.startLoopingTracks();
    } else if (this.activeHtmlAudio && this.activeHtmlAudio.paused && !this.muted && !this.isPausedByUser) {
      void this.activeHtmlAudio.play().catch(() => {});
    }
  }

  public setSongOverrideMetas(metas: Record<string, SongOverrideMeta>): void {
    this.songOverrideMetas = { ...metas };
    for (const id of this.songOverrideBuffers.keys()) {
      if (!metas[id]) {
        this.songOverrideBuffers.delete(id);
      }
    }
    for (const id of this.songOverrideRaw.keys()) {
      if (!metas[id]) {
        this.songOverrideRaw.delete(id);
      }
    }
    if (
      metas[this.musicStyle] &&
      !this.songOverrideBuffers.has(this.musicStyle) &&
      !this.songOverrideRaw.has(this.musicStyle)
    ) {
      void this.ensureSongOverrideDecoded(this.musicStyle);
    }
    if ((this.ctx || this.activeHtmlAudio) && !this.isPausedByUser) {
      this.restartMusicBuffer(0);
    }
    this.emitPlaybackSnapshot();
  }

  public async cacheDecodedSongOverride(
    songId: string,
    raw: ArrayBuffer,
    mimeType = 'audio/mpeg',
  ): Promise<boolean> {
    this.songOverrideRaw.set(songId, { data: raw, mimeType });
    const ctx = this.ensureContext();
    if (!ctx) return true;
    try {
      const decoded = await ctx.decodeAudioData(raw.slice(0));
      this.songOverrideBuffers.set(songId, decoded);
      if (this.musicStyle === songId && !this.isPausedByUser) {
        this.restartMusicBuffer(0);
      }
      this.emitPlaybackSnapshot();
      return true;
    } catch {
      // Fallback plays directly via HTMLAudioElement from IndexedDB Blob offline
      if (this.musicStyle === songId && !this.isPausedByUser) {
        this.restartMusicBuffer(0);
      }
      this.emitPlaybackSnapshot();
      return true;
    }
  }

  private async ensureSongOverrideDecoded(songId: string): Promise<boolean> {
    if (this.songOverrideBuffers.has(songId)) return true;
    if (!this.songOverrideMetas[songId]) return false;
    if (this.songOverrideRaw.has(songId)) return true;
    if (this.loadingOverrideId === songId) return false;

    this.loadingOverrideId = songId;
    try {
      const stored = await getSongOverrideBuffer(songId);
      if (!stored) return false;
      this.songOverrideRaw.set(songId, {
        data: stored.data,
        mimeType: stored.mimeType || 'audio/mpeg',
      });
      const ctx = this.ensureContext();
      if (ctx) {
        try {
          const decoded = await ctx.decodeAudioData(stored.data.slice(0));
          this.songOverrideBuffers.set(songId, decoded);
        } catch {
          // HTMLAudioElement Blob playback handles any codec offline
        }
      }
      if (this.musicStyle === songId && !this.isPausedByUser) {
        this.restartMusicBuffer(0);
      }
      this.emitPlaybackSnapshot();
      return true;
    } catch {
      return false;
    } finally {
      this.loadingOverrideId = null;
    }
  }

  public setPlaylistMetas(metas: OfflineTrackMeta[], preferredTrackId?: string): void {
    const prevActiveId = this.playlistMetas[this.activePlaylistIndex]?.id;
    this.playlistMetas = [...metas];

    // Prune stale decoded buffers & raw blobs
    const validIds = new Set(metas.map((m) => m.id));
    for (const id of this.playlistBuffers.keys()) {
      if (!validIds.has(id)) {
        this.playlistBuffers.delete(id);
      }
    }
    for (const id of this.playlistRaw.keys()) {
      if (!validIds.has(id)) {
        this.playlistRaw.delete(id);
      }
    }

    if (metas.length === 0) {
      this.activePlaylistIndex = 0;
      this.trackPauseOffsetSec = 0;
      if (this.musicStyle === 'mi_musica' && (this.activeMusicSource || this.activeHtmlAudio)) {
        this.restartMusicBuffer(0);
      }
      this.emitPlaybackSnapshot();
      return;
    }

    const targetId = preferredTrackId ?? prevActiveId;
    const foundIdx = targetId ? metas.findIndex((m) => m.id === targetId) : -1;
    this.activePlaylistIndex = foundIdx >= 0 ? foundIdx : Math.min(this.activePlaylistIndex, metas.length - 1);

    if (this.musicStyle === 'mi_musica') {
      void this.ensureActivePlaylistTrackDecoded();
    }
    this.emitPlaybackSnapshot();
  }

  public cacheDecodedTrackBuffer(
    id: string,
    raw: ArrayBuffer,
    mimeType = 'audio/mpeg',
  ): Promise<boolean> {
    this.playlistRaw.set(id, { data: raw, mimeType });
    const ctx = this.ensureContext();
    if (!ctx) return Promise.resolve(true);
    return ctx
      .decodeAudioData(raw.slice(0))
      .then((decoded) => {
        this.playlistBuffers.set(id, decoded);
        return true;
      })
      .catch(() => true);
  }

  private async ensureActivePlaylistTrackDecoded(): Promise<boolean> {
    const meta = this.playlistMetas[this.activePlaylistIndex];
    if (!meta) return false;
    if (this.playlistBuffers.has(meta.id) || this.playlistRaw.has(meta.id)) return true;
    if (this.loadingTrackId === meta.id) return false;

    this.loadingTrackId = meta.id;
    try {
      const stored = await getOfflineTrackBuffer(meta.id);
      if (!stored) return false;
      this.playlistRaw.set(meta.id, {
        data: stored.data,
        mimeType: stored.mimeType || meta.mimeType || 'audio/mpeg',
      });
      const ctx = this.ensureContext();
      if (ctx) {
        try {
          const decoded = await ctx.decodeAudioData(stored.data.slice(0));
          this.playlistBuffers.set(meta.id, decoded);
        } catch {
          // HTMLAudioElement Blob fallback plays any format offline
        }
      }
      if (
        this.musicStyle === 'mi_musica' &&
        this.playlistMetas[this.activePlaylistIndex]?.id === meta.id &&
        !this.isPausedByUser
      ) {
        this.restartMusicBuffer(0);
      }
      return true;
    } catch {
      return false;
    } finally {
      this.loadingTrackId = null;
    }
  }

  public async selectPlaylistTrack(trackId: string): Promise<void> {
    const idx = this.playlistMetas.findIndex((m) => m.id === trackId);
    if (idx < 0) return;
    this.activePlaylistIndex = idx;
    this.trackPauseOffsetSec = 0;
    this.isPausedByUser = false;
    if (this.musicStyle !== 'mi_musica') {
      this.musicStyle = 'mi_musica';
      this.styleChangeCallback?.('mi_musica');
    }
    const ctx = this.ensureContext();
    if (ctx || this.playlistRaw.has(trackId)) {
      await this.ensureActivePlaylistTrackDecoded();
      this.restartMusicBuffer(0);
    }
    this.emitPlaybackSnapshot();
  }

  public async nextTrack(): Promise<void> {
    if (this.musicStyle === 'mi_musica' && this.playlistMetas.length > 0) {
      this.activePlaylistIndex = (this.activePlaylistIndex + 1) % this.playlistMetas.length;
      this.trackPauseOffsetSec = 0;
      this.isPausedByUser = false;
      this.ensureContext();
      await this.ensureActivePlaylistTrackDecoded();
      this.restartMusicBuffer(0);
      this.emitPlaybackSnapshot();
      return;
    }

    const cycleOrder: MusicStyle[] =
      this.playlistMetas.length > 0 ? ['mi_musica', ...BUILTIN_CYCLE_ORDER] : BUILTIN_CYCLE_ORDER;
    const idx = Math.max(0, cycleOrder.indexOf(this.musicStyle));
    const nextStyle = cycleOrder[(idx + 1) % cycleOrder.length];
    this.isPausedByUser = false;
    this.trackPauseOffsetSec = 0;
    this.setMusicStyle(nextStyle);
    this.styleChangeCallback?.(nextStyle);
    if (!this.activeMusicSource && !this.activeHtmlAudio) this.startMusic(this.musicContext);
  }

  public async prevTrack(): Promise<void> {
    if (this.musicStyle === 'mi_musica' && this.playlistMetas.length > 0) {
      this.activePlaylistIndex =
        (this.activePlaylistIndex - 1 + this.playlistMetas.length) % this.playlistMetas.length;
      this.trackPauseOffsetSec = 0;
      this.isPausedByUser = false;
      this.ensureContext();
      await this.ensureActivePlaylistTrackDecoded();
      this.restartMusicBuffer(0);
      this.emitPlaybackSnapshot();
      return;
    }

    const cycleOrder: MusicStyle[] =
      this.playlistMetas.length > 0 ? ['mi_musica', ...BUILTIN_CYCLE_ORDER] : BUILTIN_CYCLE_ORDER;
    const idx = Math.max(0, cycleOrder.indexOf(this.musicStyle));
    const prevStyle = cycleOrder[(idx - 1 + cycleOrder.length) % cycleOrder.length];
    this.isPausedByUser = false;
    this.trackPauseOffsetSec = 0;
    this.setMusicStyle(prevStyle);
    this.styleChangeCallback?.(prevStyle);
    if (!this.activeMusicSource && !this.activeHtmlAudio) this.startMusic(this.musicContext);
  }

  public pauseMusicPlayback(): void {
    if (this.isPausedByUser) return;
    if (this.activeHtmlAudio) {
      this.trackPauseOffsetSec = this.activeHtmlAudio.currentTime || 0;
    } else if (this.ctx && this.activeMusicSource) {
      const elapsed = Math.max(0, this.ctx.currentTime - this.trackStartCtxTime);
      const dur = this.activeMusicSource.buffer?.duration ?? 0;
      this.trackPauseOffsetSec = dur > 0 ? elapsed % dur : 0;
    }
    this.isPausedByUser = true;
    this.stopMusic();
    this.emitPlaybackSnapshot();
  }

  public resumeMusicPlayback(): void {
    this.isPausedByUser = false;
    const ctx = this.ensureContext();
    if (this.musicStyle === 'mi_musica') {
      void this.ensureActivePlaylistTrackDecoded();
    } else if (this.songOverrideMetas[this.musicStyle]) {
      void this.ensureSongOverrideDecoded(this.musicStyle);
    } else if (this.musicStyle === 'todas_las_noches_estuvo') {
      void this.ensureBundledTrackLoaded();
    }
    if (ctx && !this.activeAmbientSource) {
      this.startAmbientTrack();
    }
    this.restartMusicBuffer(this.trackPauseOffsetSec);
    this.emitPlaybackSnapshot();
  }

  public toggleMusicPlayback(): void {
    if (this.isPausedByUser || (!this.activeMusicSource && !this.activeHtmlAudio)) {
      this.resumeMusicPlayback();
    } else {
      this.pauseMusicPlayback();
    }
  }

  public forceRestartCurrentMusic(): void {
    this.isPausedByUser = false;
    this.trackPauseOffsetSec = 0;
    this.ensureContext();
    this.restartMusicBuffer(0);
    this.emitPlaybackSnapshot();
  }

  public async ensureBundledTrackLoaded(): Promise<boolean> {
    if (this.bundledSpecialBuffer) return true;
    if (this.bundledSpecialRaw) {
      await this.decodeBundledSpecial(this.bundledSpecialRaw);
      return Boolean(this.bundledSpecialBuffer);
    }
    if (this.bundledFetchPromise) return this.bundledFetchPromise;
    if (this.bundledFetchAttempted && !BUNDLED_TRACK_REGISTRY.todas_las_noches_estuvo.bundled) {
      return false;
    }

    this.bundledFetchAttempted = true;
    this.bundledFetchPromise = (async () => {
      const asset = await fetchBundledAssetBuffer('todas_las_noches_estuvo');
      if (!asset) return false;
      this.bundledSpecialRaw = asset.data;
      if (this.ctx) {
        await this.decodeBundledSpecial(asset.data);
      }
      return true;
    })().finally(() => {
      this.bundledFetchPromise = null;
    });

    return this.bundledFetchPromise;
  }

  private async decodeBundledSpecial(raw: ArrayBuffer): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const decoded = await ctx.decodeAudioData(raw.slice(0));
      this.bundledSpecialBuffer = decoded;
      if (
        this.activeMusicSource &&
        this.musicStyle === 'todas_las_noches_estuvo' &&
        !this.isPausedByUser
      ) {
        this.restartMusicBuffer(0);
      }
    } catch {
      this.bundledSpecialBuffer = null;
    }
  }

  public async setCustomTrackData(
    raw: ArrayBuffer | null,
    _source: 'user' | 'bundled' = 'user',
  ): Promise<boolean> {
    if (!raw) {
      this.bundledSpecialRaw = null;
      this.bundledSpecialBuffer = null;
      this.bundledFetchAttempted = false;
      if (BUNDLED_TRACK_REGISTRY.todas_las_noches_estuvo.bundled) {
        await this.ensureBundledTrackLoaded();
      }
      if (this.ctx && this.activeMusicSource && !this.isPausedByUser) {
        this.restartMusicBuffer(0);
      }
      this.emitPlaybackSnapshot();
      return true;
    }
    this.bundledSpecialRaw = raw;
    const ctx = this.ensureContext();
    if (!ctx) return true;
    try {
      const decoded = await ctx.decodeAudioData(raw.slice(0));
      this.bundledSpecialBuffer = decoded;
      if (
        this.activeMusicSource &&
        this.musicStyle === 'todas_las_noches_estuvo' &&
        !this.isPausedByUser
      ) {
        this.restartMusicBuffer(0);
      }
      this.emitPlaybackSnapshot();
      return true;
    } catch {
      this.bundledSpecialBuffer = null;
      return false;
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.musicMasterGain && this.ctx) {
      this.musicMasterGain.gain.setTargetAtTime(
        muted ? 0 : this.musicVolume * 0.45,
        this.ctx.currentTime,
        0.05,
      );
    }
    if (this.ambientMasterGain && this.ctx) {
      this.ambientMasterGain.gain.setTargetAtTime(
        muted ? 0 : this.ambientVolume * 0.25,
        this.ctx.currentTime,
        0.05,
      );
    }
    this.syncHtmlAudioVolume();
    this.emitPlaybackSnapshot();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolumes(
    musicVol: number,
    sfxVol: number,
    ambientVol = 0.55,
    vehicleVol = 0.78,
  ): void {
    this.musicVolume = Math.max(0, Math.min(1, musicVol));
    this.sfxVolume = Math.max(0, Math.min(1, sfxVol));
    this.ambientVolume = Math.max(0, Math.min(1, ambientVol));
    this.vehicleVolume = Math.max(0, Math.min(1, vehicleVol));

    if (this.ctx && !this.muted) {
      if (this.musicMasterGain) {
        this.musicMasterGain.gain.setTargetAtTime(this.musicVolume * 0.45, this.ctx.currentTime, 0.05);
      }
      if (this.ambientMasterGain) {
        this.ambientMasterGain.gain.setTargetAtTime(this.ambientVolume * 0.25, this.ctx.currentTime, 0.05);
      }
    }
    this.syncHtmlAudioVolume();
  }

  public setMusicStyle(style: MusicStyle): void {
    if (this.musicStyle === style) return;
    this.musicStyle = style;
    this.trackPauseOffsetSec = 0;
    if (this.songOverrideMetas[style]) {
      void this.ensureSongOverrideDecoded(style);
    } else if (style === 'todas_las_noches_estuvo') {
      void this.ensureBundledTrackLoaded();
    } else if (style === 'mi_musica') {
      void this.ensureActivePlaylistTrackDecoded();
    }
    if ((this.ctx || this.activeHtmlAudio) && !this.isPausedByUser) {
      this.restartMusicBuffer(0);
    }
    this.emitPlaybackSnapshot();
  }

  public setMusicContext(context: MusicContext): void {
    if (this.musicContext === context) return;
    this.musicContext = context;
    const isPlayingFullAudioFile =
      Boolean(this.activeHtmlAudio) ||
      Boolean(this.songOverrideBuffers.get(this.musicStyle)) ||
      (this.musicStyle === 'todas_las_noches_estuvo' && Boolean(this.bundledSpecialBuffer)) ||
      (this.musicStyle === 'mi_musica' && this.playlistMetas.length > 0);
    if (this.ctx && this.activeMusicSource && !isPlayingFullAudioFile && !this.isPausedByUser) {
      this.restartMusicBuffer(0);
    }
  }

  private sfxGain(base: number): number {
    return this.muted ? 0 : base * this.sfxVolume;
  }

  private vehicleGain(base: number): number {
    return this.muted ? 0 : base * this.vehicleVolume;
  }

  private buildLoopBuffer(ctx: AudioContext, style: MusicStyle, context: MusicContext): AudioBuffer {
    const key = `${style}:${context}`;
    const cached = this.bufferCache.get(key);
    if (cached) return cached;

    const sampleRate = ctx.sampleRate;
    const tempoBpm =
      context === 'chase'
        ? 134
        : context === 'menu'
          ? 108
          : context === 'shop'
            ? 114
            : style === 'sopa_de_caracol'
              ? 136
              : style === 'brisa_la_ceiba'
                ? 128
                : style === 'raspe' || style === 'todas_las_noches_estuvo'
                  ? 130
                  : style === 'orgullo_catracho'
                    ? 112
                    : style === 'vuelo_guacamaya'
                      ? 118
                      : 124;
    const stepDur = 60 / tempoBpm / 2;
    const totalSteps = 32;
    const duration = totalSteps * stepDur;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const scaleByStyle: Record<MusicStyle, number[]> = {
      mi_musica: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25],
      todas_las_noches_estuvo: [293.66, 329.63, 369.99, 440.0, 493.88, 587.33],
      sopa_de_caracol: [261.63, 311.13, 349.23, 392.0, 466.16, 523.25],
      tegucigalpa_noche: [246.94, 293.66, 329.63, 369.99, 440.0, 493.88],
      brisa_la_ceiba: [293.66, 349.23, 392.0, 440.0, 523.25, 587.33],
      orgullo_catracho: [196.0, 233.08, 261.63, 293.66, 349.23, 392.0],
      vuelo_guacamaya: [261.63, 293.66, 349.23, 392.0, 440.0, 523.25],
      raspe: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25],
      punta: [261.63, 311.13, 349.23, 392.0, 466.16, 523.25],
      rap: [220.0, 246.94, 261.63, 293.66, 329.63, 392.0],
      tropical: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25],
      urbana: [196.0, 233.08, 261.63, 293.66, 349.23, 392.0],
      cinematica: [146.83, 174.61, 220.0, 261.63, 293.66, 349.23],
    };

    const bassByStyle: Record<MusicStyle, number[]> = {
      mi_musica: [130.81, 146.83, 164.81, 196.0],
      todas_las_noches_estuvo: [146.83, 164.81, 196.0, 220.0],
      sopa_de_caracol: [130.81, 155.56, 174.61, 196.0],
      tegucigalpa_noche: [123.47, 146.83, 164.81, 185.0],
      brisa_la_ceiba: [146.83, 174.61, 196.0, 220.0],
      orgullo_catracho: [98.0, 116.54, 130.81, 98.0],
      vuelo_guacamaya: [130.81, 174.61, 196.0, 146.83],
      raspe: [130.81, 146.83, 164.81, 196.0],
      punta: [130.81, 130.81, 155.56, 174.61],
      rap: [110.0, 110.0, 98.0, 130.81],
      tropical: [130.81, 164.81, 174.61, 196.0],
      urbana: [98.0, 98.0, 116.54, 130.81],
      cinematica: [73.42, 87.31, 110.0, 98.0],
    };

    const notes = scaleByStyle[style];
    const bassNotes = bassByStyle[style];

    const addTone = (startSample: number, durSec: number, freq: number, amp: number, wave: 'sine' | 'tri') => {
      const count = Math.min(length - startSample, Math.floor(durSec * sampleRate));
      for (let i = 0; i < count; i++) {
        const t = i / sampleRate;
        const env = Math.min(1, t * 40) * Math.exp(-t * (style === 'cinematica' ? 3.5 : 8.0));
        const phase = t * freq * Math.PI * 2;
        const raw = wave === 'sine' ? Math.sin(phase) : (2 / Math.PI) * Math.asin(Math.sin(phase));
        data[startSample + i] += raw * env * amp;
      }
    };

    const addDrum = (startSample: number, isKick: boolean, amp: number) => {
      const dur = isKick ? 0.14 : 0.06;
      const count = Math.min(length - startSample, Math.floor(dur * sampleRate));
      for (let i = 0; i < count; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * (isKick ? 22 : 45));
        if (isKick) {
          const f = 135 * Math.exp(-t * 18) + 42;
          data[startSample + i] += Math.sin(2 * Math.PI * f * t) * env * amp;
        } else {
          const noise = Math.sin(i * 12.9898) * 43758.5453;
          const n = (noise - Math.floor(noise)) * 2 - 1;
          data[startSample + i] += n * env * amp * 0.55;
        }
      }
    };

    const addRaspa = (startSample: number, longStroke: boolean, amp: number) => {
      const dur = longStroke ? 0.11 : 0.055;
      const count = Math.min(length - startSample, Math.floor(dur * sampleRate));
      for (let i = 0; i < count; i++) {
        const t = i / sampleRate;
        const teeth = Math.abs(Math.sin(2 * Math.PI * 46 * t));
        const noise = Math.sin((startSample + i) * 19.317) * 43758.5453;
        const n = (noise - Math.floor(noise)) * 2 - 1;
        const env = Math.sin((t / dur) * Math.PI);
        data[startSample + i] += n * teeth * env * amp;
      }
    };

    const isRaspeLike =
      style === 'raspe' ||
      style === 'todas_las_noches_estuvo' ||
      style === 'tegucigalpa_noche';
    const isPuntaLike =
      style === 'punta' || style === 'sopa_de_caracol' || style === 'brisa_la_ceiba';

    for (let s = 0; s < totalSteps; s++) {
      const startSample = Math.floor(s * stepDur * sampleRate);

      if (isRaspeLike) {
        if (s % 4 === 0 || s % 8 === 3 || s % 8 === 6) addDrum(startSample, true, 0.44);
        addRaspa(startSample, s % 4 === 2, s % 2 === 0 ? 0.24 : 0.15);
        if (s % 4 === 2) addTone(startSample, 0.05, 880, 0.07, 'tri');
      } else if (isPuntaLike) {
        if (s % 4 === 0 || s % 8 === 3 || s % 8 === 6) addDrum(startSample, true, 0.44);
        if (s % 2 === 1) addDrum(startSample, false, 0.24);
        if (style === 'brisa_la_ceiba' && s % 4 === 2) addRaspa(startSample, true, 0.16);
      } else if (style === 'rap' || style === 'urbana' || style === 'orgullo_catracho') {
        if (s % 8 === 0 || s % 8 === 3 || s % 8 === 5) addDrum(startSample, true, 0.46);
        if (s % 8 === 2 || s % 8 === 6) addDrum(startSample, false, 0.3);
      } else if (style === 'vuelo_guacamaya' || style === 'tropical') {
        if (s % 4 === 0) addDrum(startSample, true, 0.34);
        if (s % 4 === 2) addDrum(startSample, false, 0.18);
      } else {
        if (s % 4 === 0) addDrum(startSample, true, 0.36);
      }

      if (s % 2 === 0 || ((isRaspeLike || isPuntaLike) && s % 4 === 3)) {
        const bFreq = bassNotes[Math.floor(s / 8) % bassNotes.length];
        addTone(
          startSample,
          stepDur * 1.55,
          bFreq,
          isRaspeLike || isPuntaLike ? 0.28 : 0.24,
          'tri',
        );
      }

      if (isRaspeLike) {
        const riffSteps =
          style === 'todas_las_noches_estuvo'
            ? [0, 1, 3, 4, 6, 8, 10, 12, 13, 15]
            : style === 'tegucigalpa_noche'
              ? [0, 2, 4, 6, 7, 9, 11, 12, 14]
              : [0, 2, 3, 5, 6, 8, 10, 11, 13, 14];
        if (riffSteps.includes(s % 16)) {
          const nIdx = (s * 2 + (s % 8 === 3 ? 1 : 0)) % notes.length;
          addTone(startSample, stepDur * 0.9, notes[nIdx], context === 'menu' ? 0.16 : 0.21, 'tri');
          if (s % 4 === 0) {
            addTone(startSample, stepDur * 0.8, notes[(nIdx + 2) % notes.length], 0.1, 'sine');
          }
        }
      } else if (style === 'vuelo_guacamaya') {
        // Warm woody marimba arpeggios
        const nIdx = (s * 2) % notes.length;
        addTone(startSample, stepDur * 0.65, notes[nIdx], 0.2, 'sine');
        if (s % 2 === 0) {
          addTone(startSample, stepDur * 0.55, notes[(nIdx + 2) % notes.length] * 2, 0.08, 'sine');
        }
      } else if (context !== 'shop' || s % 2 === 0) {
        const patternIdx = (s * 3 + (context === 'chase' ? 2 : 1)) % notes.length;
        if (s % 4 !== 3 || context === 'chase') {
          addTone(
            startSample,
            stepDur * (style === 'cinematica' ? 2.2 : 1.15),
            notes[patternIdx],
            context === 'menu' ? 0.14 : 0.19,
            style === 'rap' || style === 'orgullo_catracho' ? 'tri' : 'sine',
          );
        }
      }
    }

    for (let i = 0; i < length; i++) {
      data[i] = Math.tanh(data[i]);
    }

    this.bufferCache.set(key, buffer);
    return buffer;
  }

  private buildAmbientBuffer(ctx: AudioContext): AudioBuffer {
    if (this.ambientBuffer) return this.ambientBuffer;
    const sr = ctx.sampleRate;
    const dur = 4.0;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    let low = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const white = Math.random() * 2 - 1;
      low = low * 0.96 + white * 0.04;
      const engineHum = Math.sin(2 * Math.PI * 68 * t) * 0.12 + Math.sin(2 * Math.PI * 102 * t) * 0.06;
      data[i] = (low * 1.4 + engineHum) * 0.35;
    }

    this.ambientBuffer = buf;
    return buf;
  }

  private startAmbientTrack(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.ambientMasterGain || this.activeAmbientSource) return;
    const amb = ctx.createBufferSource();
    amb.buffer = this.buildAmbientBuffer(ctx);
    amb.loop = true;
    amb.connect(this.ambientMasterGain);
    amb.start();
    this.activeAmbientSource = amb;
  }

  private startLoopingTracks(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicMasterGain || !this.ambientMasterGain) return;
    if (!this.isPausedByUser) {
      this.restartMusicBuffer(this.trackPauseOffsetSec);
    }
    this.startAmbientTrack();
  }

  private stopActiveMusicSourceInternal(): void {
    if (!this.activeMusicSource) return;
    this.manualStopGuard = true;
    try {
      this.activeMusicSource.onended = null;
      this.activeMusicSource.stop();
      this.activeMusicSource.disconnect();
    } catch {
      // Ignore already stopped
    }
    this.activeMusicSource = null;
    this.manualStopGuard = false;
  }

  private syncHtmlAudioVolume(): void {
    if (this.activeHtmlAudio) {
      this.activeHtmlAudio.volume = this.muted
        ? 0
        : Math.max(0, Math.min(1, this.musicVolume * 0.8));
    }
  }

  private stopHtmlAudio(): void {
    if (this.activeHtmlAudio) {
      try {
        this.activeHtmlAudio.onended = null;
        this.activeHtmlAudio.pause();
        this.activeHtmlAudio.src = '';
      } catch {
        // Ignore media stop issues
      }
      this.activeHtmlAudio = null;
    }
    if (this.activeHtmlAudioUrl) {
      try {
        URL.revokeObjectURL(this.activeHtmlAudioUrl);
      } catch {
        // Ignore revoke error
      }
      this.activeHtmlAudioUrl = null;
    }
  }

  private startHtmlAudioFromRaw(
    raw: { data: ArrayBuffer; mimeType: string },
    offsetSec: number,
    loop: boolean,
    onEndedNext?: () => void,
  ): void {
    this.stopActiveMusicSourceInternal();
    this.stopHtmlAudio();

    const blob = new Blob([raw.data], { type: raw.mimeType || 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.loop = loop;
    audio.preload = 'auto';
    audio.volume = this.muted ? 0 : Math.max(0, Math.min(1, this.musicVolume * 0.8));

    if (offsetSec > 0.1) {
      audio.addEventListener(
        'loadedmetadata',
        () => {
          try {
            if (Number.isFinite(audio.duration) && audio.duration > 0.25) {
              audio.currentTime = offsetSec % audio.duration;
            }
          } catch {
            // Ignore seek failure
          }
        },
        { once: true },
      );
    }

    if (!loop && onEndedNext) {
      audio.onended = () => {
        if (!this.isPausedByUser) {
          onEndedNext();
        }
      };
    }

    this.activeHtmlAudio = audio;
    this.activeHtmlAudioUrl = url;
    void audio.play().catch(() => {});
    this.emitPlaybackSnapshot();
  }

  private restartMusicBuffer(offsetSec = 0): void {
    if (this.isPausedByUser) return;

    this.stopActiveMusicSourceInternal();
    this.stopHtmlAudio();

    let resolvedBuffer: AudioBuffer | null = null;
    let rawFallback: { data: ArrayBuffer; mimeType: string } | null = null;
    let isMultiPlaylist = false;

    if (this.musicStyle === 'mi_musica') {
      const activeMeta = this.playlistMetas[this.activePlaylistIndex];
      if (activeMeta) {
        isMultiPlaylist = this.playlistMetas.length > 1;
        const buf = this.playlistBuffers.get(activeMeta.id);
        const raw = this.playlistRaw.get(activeMeta.id);
        if (buf) {
          resolvedBuffer = buf;
        } else if (raw) {
          rawFallback = raw;
        } else {
          void this.ensureActivePlaylistTrackDecoded();
        }
      }
    } else if (this.songOverrideBuffers.has(this.musicStyle)) {
      resolvedBuffer = this.songOverrideBuffers.get(this.musicStyle)!;
    } else if (this.songOverrideRaw.has(this.musicStyle)) {
      rawFallback = this.songOverrideRaw.get(this.musicStyle)!;
    } else if (this.songOverrideMetas[this.musicStyle]) {
      void this.ensureSongOverrideDecoded(this.musicStyle);
    } else if (this.musicStyle === 'todas_las_noches_estuvo') {
      if (this.bundledSpecialBuffer) {
        resolvedBuffer = this.bundledSpecialBuffer;
      } else if (this.playlistMetas.length > 0) {
        const match = this.playlistMetas.find((m) =>
          m.name.toLowerCase().includes('todas') && m.name.toLowerCase().includes('noches'),
        );
        if (match && this.playlistBuffers.has(match.id)) {
          resolvedBuffer = this.playlistBuffers.get(match.id)!;
        } else if (match && this.playlistRaw.has(match.id)) {
          rawFallback = this.playlistRaw.get(match.id)!;
        }
      }
    }

    if (!resolvedBuffer && rawFallback) {
      this.startHtmlAudioFromRaw(
        rawFallback,
        offsetSec,
        !isMultiPlaylist,
        isMultiPlaylist
          ? () => {
              if (this.musicStyle === 'mi_musica' && this.playlistMetas.length > 1) {
                void this.nextTrack();
              }
            }
          : undefined,
      );
      return;
    }

    const ctx = this.ctx;
    if (!ctx || !this.musicMasterGain) return;

    const finalBuffer =
      resolvedBuffer ?? this.buildLoopBuffer(ctx, this.musicStyle, this.musicContext);
    const safeOffset =
      finalBuffer.duration > 0.25 ? Math.max(0, offsetSec % finalBuffer.duration) : 0;

    const src = ctx.createBufferSource();
    src.buffer = finalBuffer;
    src.loop = !isMultiPlaylist;
    if (isMultiPlaylist) {
      src.onended = () => {
        if (this.manualStopGuard || this.isPausedByUser || this.musicStyle !== 'mi_musica') {
          return;
        }
        if (this.playlistMetas.length > 1) {
          void this.nextTrack();
        }
      };
    }

    src.connect(this.musicMasterGain);
    src.start(0, safeOffset);
    this.trackStartCtxTime = ctx.currentTime - safeOffset;
    this.activeMusicSource = src;
    this.emitPlaybackSnapshot();
  }

  public startMusic(context: MusicContext = 'run'): void {
    this.musicContext = context;
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (
      this.songOverrideMetas[this.musicStyle] &&
      !this.songOverrideBuffers.has(this.musicStyle) &&
      !this.songOverrideRaw.has(this.musicStyle)
    ) {
      void this.ensureSongOverrideDecoded(this.musicStyle);
    } else if (this.musicStyle === 'todas_las_noches_estuvo' && !this.bundledSpecialBuffer) {
      void this.ensureBundledTrackLoaded();
    } else if (this.musicStyle === 'mi_musica' && this.playlistMetas.length > 0) {
      void this.ensureActivePlaylistTrackDecoded();
    }

    this.startAmbientTrack();
    if (this.isPausedByUser) {
      this.emitPlaybackSnapshot();
      return;
    }

    const isPlayingFullAudioFile =
      Boolean(this.activeHtmlAudio) ||
      Boolean(this.songOverrideBuffers.get(this.musicStyle)) ||
      (this.musicStyle === 'todas_las_noches_estuvo' && Boolean(this.bundledSpecialBuffer)) ||
      (this.musicStyle === 'mi_musica' &&
        Boolean(this.playlistMetas[this.activePlaylistIndex]) &&
        (this.playlistBuffers.has(this.playlistMetas[this.activePlaylistIndex].id) ||
          this.playlistRaw.has(this.playlistMetas[this.activePlaylistIndex].id)));

    if (!this.activeMusicSource && !this.activeHtmlAudio) {
      this.restartMusicBuffer(this.trackPauseOffsetSec);
    } else if (!isPlayingFullAudioFile) {
      this.restartMusicBuffer(0);
    }
  }

  public stopMusic(): void {
    this.stopActiveMusicSourceInternal();
    this.stopHtmlAudio();
    this.emitPlaybackSnapshot();
  }

  public playButton(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.sfxVolume <= 0.01 || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.045);
    gain.gain.setValueAtTime(this.sfxGain(0.09), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playLaneSwitch(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.sfxVolume <= 0.01 || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(390, now + 0.055);
    gain.gain.setValueAtTime(this.sfxGain(0.08), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playJump(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.sfxVolume <= 0.01 || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(195, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.15);
    gain.gain.setValueAtTime(this.sfxGain(0.14), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playLand(onRoof: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || this.sfxVolume <= 0.01 || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = onRoof ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(onRoof ? 185 : 115, now);
    osc.frequency.exponentialRampToValueAtTime(onRoof ? 72 : 48, now + 0.11);
    gain.gain.setValueAtTime(this.sfxGain(onRoof ? 0.17 : 0.12), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playRoofStep(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.sfxVolume <= 0.01 || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.045);
    gain.gain.setValueAtTime(this.sfxGain(0.055), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playDuck(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.sfxVolume <= 0.01 || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(125, now + 0.13);
    gain.gain.setValueAtTime(this.sfxGain(0.11), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playCoin(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.sfxVolume <= 0.01 || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, now);
    osc.frequency.setValueAtTime(1396.91, now + 0.05);
    gain.gain.setValueAtTime(this.sfxGain(0.12), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playCelebrate(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.sfxVolume <= 0.01 || this.muted) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.06;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(this.sfxGain(0.11), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.23);
    });
  }

  public playPoliceWhistle(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.sfxVolume <= 0.01 || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2550, now);
    osc.frequency.linearRampToValueAtTime(2800, now + 0.1);
    osc.frequency.linearRampToValueAtTime(2400, now + 0.28);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(34, now);
    lfoGain.gain.setValueAtTime(140, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(this.sfxGain(0.09), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.35);
    lfo.stop(now + 0.35);
  }

  public playVehiclePassHorn(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.vehicleVolume <= 0.01 || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(195, now + 0.22);
    gain.gain.setValueAtTime(this.vehicleGain(0.04), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playVehicleEngineRumble(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.vehicleVolume <= 0.01 || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(74, now);
    osc.frequency.linearRampToValueAtTime(58, now + 0.28);
    gain.gain.setValueAtTime(this.vehicleGain(0.04), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.31);
  }

  public playCarBump(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.sfxVolume <= 0.01 || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.22);
    gain.gain.setValueAtTime(this.sfxGain(0.18), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playStumble(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.sfxVolume <= 0.01 || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.16);
    gain.gain.setValueAtTime(this.sfxGain(0.15), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playCrash(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.sfxVolume <= 0.01 || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.28);
    gain.gain.setValueAtTime(this.sfxGain(0.22), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.31);
  }

  public playGameOver(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.sfxVolume <= 0.01 || this.muted) return;
    const now = ctx.currentTime;
    [392, 349.23, 311.13, 261.63].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.12;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(this.sfxGain(0.13), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.27);
    });
  }
}

export const soundEngine = new SoundEngine();

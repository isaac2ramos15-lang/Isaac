import type { ChangeEvent } from 'react';
import {
  X,
  RotateCcw,
  Music,
  Trash2,
  Upload,
  CheckCircle2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ListMusic,
} from 'lucide-react';
import { BUNDLED_TRACK_REGISTRY } from '../audio/bundledAudioRegistry';
import { SONG_CATALOG_META, type MusicPlaybackSnapshot } from '../audio/soundEngine';
import type { OfflineTrackMeta, SongOverrideMeta } from '../services/customAudioStorage';
import type { ControlScheme, GameSettings, GraphicsQuality, MusicStyle } from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  playlist: OfflineTrackMeta[];
  songOverrides: Record<string, SongOverrideMeta>;
  playback: MusicPlaybackSnapshot;
  muted: boolean;
  bundledAssetName: string | null;
  trackUploadError: string | null;
  onUploadTracks: (files: File[]) => void;
  onUploadSongOverride: (songId: string, file: File) => void;
  onDeleteSongOverride: (songId: string) => void;
  onSelectTrack: (trackId: string) => void;
  onDeleteTrack: (trackId: string) => void;
  onClearPlaylist: () => void;
  onTogglePlayPause: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onToggleMute: () => void;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

function formatTrackSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function SettingsModal({
  settings,
  playlist,
  songOverrides,
  playback,
  muted,
  bundledAssetName,
  trackUploadError,
  onUploadTracks,
  onUploadSongOverride,
  onDeleteSongOverride,
  onSelectTrack,
  onDeleteTrack,
  onClearPlaylist,
  onTogglePlayPause,
  onPrevTrack,
  onNextTrack,
  onToggleMute,
  onUpdateSettings,
  onResetProgress,
  onClose,
}: SettingsModalProps) {
  const registryEntry = BUNDLED_TRACK_REGISTRY.todas_las_noches_estuvo;
  const activeLocalAsset =
    bundledAssetName ?? (registryEntry.bundled ? registryEntry.fileName : null);

  const handleAudioFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      onUploadTracks(files);
    }
    e.target.value = '';
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-6 bg-[#070d16]/86">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0b1322] border border-white/15 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-white">Configuración</h2>
            <p className="text-xs text-slate-300">
              Canciones del juego, subida de pistas offline, audio, gráficos y controles
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar configuración"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/8 hover:bg-white/15 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Active Music Transport Controls */}
          <div className="rounded-xl bg-[#0f1a2e] border border-sky-400/25 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
                  Reproductor Activo (Sin Internet)
                </div>
                <div className="text-sm font-extrabold text-white truncate mt-0.5">
                  {playback.activeTrackTitle}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onPrevTrack}
                  aria-label="Canción anterior"
                  className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/18 text-white cursor-pointer"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onTogglePlayPause}
                  aria-label={playback.isPlaying ? 'Pausar música' : 'Reproducir música'}
                  className="min-w-[40px] min-h-[38px] flex items-center justify-center rounded-lg bg-[#00a8e8] hover:bg-[#0ea5e9] text-slate-950 cursor-pointer"
                >
                  {playback.isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={onNextTrack}
                  aria-label="Siguiente canción"
                  className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/18 text-white cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Mi Música Offline Mode Button */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-300 mb-2">
              Canciones del Juego (Sube tu Pista a Cualquiera)
            </div>

            <button
              type="button"
              onClick={() => onUpdateSettings({ musicStyle: 'mi_musica' })}
              className={`w-full min-h-[48px] px-3.5 py-2 rounded-xl border text-left flex items-center justify-between gap-2 mb-2.5 transition-colors cursor-pointer ${
                settings.musicStyle === 'mi_musica'
                  ? 'bg-[#00a8e8] border-[#00a8e8] text-slate-950'
                  : 'bg-white/5 hover:bg-white/10 border-white/15 text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ListMusic className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-extrabold truncate">Mi Lista de Música Offline</div>
                  <div
                    className={`text-[11px] truncate ${
                      settings.musicStyle === 'mi_musica' ? 'text-slate-900/85' : 'text-slate-300'
                    }`}
                  >
                    {playlist.length > 0
                      ? `${playlist.length} ${playlist.length === 1 ? 'pista propia cargada' : 'pistas propias cargadas'}`
                      : 'Sube una o varias pistas abajo para armar tu playlist'}
                  </div>
                </div>
              </div>
              {playlist.length > 0 && (
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${
                    settings.musicStyle === 'mi_musica' ? 'text-slate-950' : 'text-emerald-400'
                  }`}
                />
              )}
            </button>

            {/* 6 Named Honduran Songs with Per-Song Custom Track Upload */}
            <div className="space-y-1.5 mb-3">
              {SONG_CATALOG_META.map((song) => {
                const isSelected = settings.musicStyle === song.id;
                const customMeta = songOverrides[song.id];
                const isLocalBundled =
                  song.id === 'todas_las_noches_estuvo' && Boolean(activeLocalAsset);

                return (
                  <div
                    key={song.id}
                    className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-sky-500/20 border-[#00a8e8] text-white'
                        : 'bg-white/5 border-white/12 text-white hover:bg-white/8'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ musicStyle: song.id })}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <Music
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-sky-300' : 'text-slate-400'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-extrabold truncate">{song.title}</div>
                        <div className="text-[11px] text-slate-300 truncate">
                          {customMeta
                            ? `Pista cargada: ${customMeta.name}`
                            : isLocalBundled
                              ? `Asset local: ${activeLocalAsset}`
                              : song.subtitle}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {customMeta && (
                        <button
                          type="button"
                          onClick={() => onDeleteSongOverride(song.id)}
                          aria-label={`Quitar pista de ${song.title}`}
                          title="Quitar pista cargada"
                          className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <label
                        title={`Subir pista para ${song.title}`}
                        className={`min-h-[32px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                          customMeta
                            ? 'bg-emerald-500/20 border border-emerald-400/35 text-emerald-200 hover:bg-emerald-500/30'
                            : 'bg-amber-400/18 border border-amber-300/35 text-amber-200 hover:bg-amber-400/30'
                        }`}
                      >
                        <Upload className="w-3 h-3" />
                        <span>{customMeta ? 'Cambiar' : 'Subir Pista'}</span>
                        <input
                          type="file"
                          accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onUploadSongOverride(song.id, file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Estilos Ambientales Extra
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  ['raspe', 'Raspe Catracho'],
                  ['punta', 'Punta'],
                  ['rap', 'Rap'],
                  ['tropical', 'Tropical'],
                  ['urbana', 'Urbana'],
                  ['cinematica', 'Cinemática'],
                ] as [MusicStyle, string][]
              ).map(([style, label]) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => onUpdateSettings({ musicStyle: style })}
                  className={`min-h-[40px] px-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                    settings.musicStyle === style
                      ? 'bg-[#00a8e8] border-[#00a8e8] text-slate-950'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Multi-Song Offline Playlist Manager */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                  <ListMusic className="w-3.5 h-3.5 shrink-0" />
                  <span>Lista de Canciones Guardadas Offline ({playlist.length})</span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Sube varias canciones (.mp3, .wav, .ogg, .m4a). Quedan guardadas en tu dispositivo para escucharlas sin internet.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#00a8e8] hover:bg-[#0ea5e9] text-slate-950 text-xs font-extrabold cursor-pointer whitespace-nowrap">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Agregar Canciones</span>
                  <input
                    type="file"
                    multiple
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
                    className="hidden"
                    onChange={handleAudioFiles}
                  />
                </label>

                {playlist.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearPlaylist}
                    aria-label="Vaciar lista de canciones"
                    title="Vaciar lista"
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {playlist.length > 0 && (
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {playlist.map((track, idx) => {
                  const isActive =
                    settings.musicStyle === 'mi_musica' && playback.activeTrackId === track.id;
                  return (
                    <div
                      key={track.id}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 border transition-colors ${
                        isActive
                          ? 'bg-sky-500/20 border-sky-400/50 text-white'
                          : 'bg-black/25 border-white/10 text-slate-200 hover:bg-white/8'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectTrack(track.id)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <Play
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-sky-300 fill-current' : 'text-slate-400'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate">
                            {idx + 1}. {track.name.replace(/\.[^/.]+$/, '')}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatTrackSize(track.sizeBytes)} · Guardada offline
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteTrack(track.id)}
                        aria-label={`Eliminar ${track.name}`}
                        className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-md hover:bg-rose-500/25 text-slate-300 hover:text-rose-200 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {trackUploadError && (
              <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-lg px-3 py-1.5">
                {trackUploadError}
              </p>
            )}
          </div>

          {/* Independent Volume Sliders */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center text-xs text-slate-200 mb-1">
                <span>Volumen de Música</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onToggleMute}
                    className="text-[11px] font-bold px-2 py-0.5 rounded bg-white/10 hover:bg-white/15 text-slate-200 cursor-pointer"
                  >
                    {muted ? 'Silenciado' : 'Activo'}
                  </button>
                  <span className="font-score text-sky-300">
                    {Math.round(settings.musicVolume * 100)}%
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.musicVolume * 100)}
                onChange={(e) => {
                  const vol = Number(e.target.value) / 100;
                  if (muted && vol > 0) onToggleMute();
                  onUpdateSettings({ musicVolume: vol });
                }}
                className="w-full accent-[#00a8e8] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-200 mb-1">
                <span>Efectos de Carrera, Monedas y Techos</span>
                <span className="font-score text-sky-300">
                  {Math.round(settings.sfxVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.sfxVolume * 100)}
                onChange={(e) => onUpdateSettings({ sfxVolume: Number(e.target.value) / 100 })}
                className="w-full accent-[#00a8e8] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-200 mb-1">
                <span>Vehículos, Motores y Bocinas</span>
                <span className="font-score text-sky-300">
                  {Math.round(settings.vehicleVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.vehicleVolume * 100)}
                onChange={(e) => onUpdateSettings({ vehicleVolume: Number(e.target.value) / 100 })}
                className="w-full accent-[#00a8e8] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-200 mb-1">
                <span>Sonido Ambiental de Ciudad</span>
                <span className="font-score text-sky-300">
                  {Math.round(settings.ambientVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.ambientVolume * 100)}
                onChange={(e) => onUpdateSettings({ ambientVolume: Number(e.target.value) / 100 })}
                className="w-full accent-[#00a8e8] cursor-pointer"
              />
            </div>
          </div>

          {/* Graphics Quality */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-300 mb-2">
              Calidad Gráfica y Rendimiento
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['ultra', 'Ultra (2x DPR)'],
                  ['high', 'Alta (Sombras)'],
                  ['optimized', 'Optimizada'],
                ] as [GraphicsQuality, string][]
              ).map(([q, label]) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onUpdateSettings({ quality: q })}
                  className={`min-h-[42px] px-2.5 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                    settings.quality === q
                      ? 'bg-[#00a8e8] border-[#00a8e8] text-slate-950'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Touch Sensitivity & Desktop Controls */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-200 mb-1">
                <span>Sensibilidad Táctil (Android / iOS)</span>
                <span className="font-score text-sky-300">
                  {settings.touchSensitivity.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min={6}
                max={16}
                value={Math.round(settings.touchSensitivity * 10)}
                onChange={(e) =>
                  onUpdateSettings({ touchSensitivity: Number(e.target.value) / 10 })
                }
                className="w-full accent-[#00a8e8] cursor-pointer"
              />
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-sky-300 mb-2">
                Controles de Teclado (Windows)
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['both', 'Flechas + WASD'],
                    ['arrows', 'Solo Flechas'],
                    ['wasd', 'Solo WASD'],
                  ] as [ControlScheme, string][]
                ).map(([scheme, label]) => (
                  <button
                    key={scheme}
                    type="button"
                    onClick={() => onUpdateSettings({ controlScheme: scheme })}
                    className={`min-h-[40px] px-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                      settings.controlScheme === scheme
                        ? 'bg-[#00a8e8] border-[#00a8e8] text-slate-950'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center justify-between text-xs">
            <span className="text-slate-300">Idioma de la interfaz y diálogos</span>
            <span className="font-bold text-white">Español (Honduras)</span>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              Reiniciar monedas, récords, ciudades e historia inicial
            </span>
            <button
              type="button"
              onClick={onResetProgress}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-200 text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar Datos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

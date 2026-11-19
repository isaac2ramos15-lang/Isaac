import { useState, type ChangeEvent } from 'react';
import { Music, Pause, Play, SkipBack, SkipForward, Upload, Volume2, VolumeX } from 'lucide-react';
import type { MusicPlaybackSnapshot } from '../audio/soundEngine';

interface MusicControlsBarProps {
  playback: MusicPlaybackSnapshot;
  musicVolume: number;
  muted: boolean;
  compact?: boolean;
  onTogglePlayPause: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onChangeMusicVolume: (volume: number) => void;
  onToggleMute: () => void;
  onUploadQuickTracks?: (files: File[]) => void;
}

export function MusicControlsBar({
  playback,
  musicVolume,
  muted,
  compact = false,
  onTogglePlayPause,
  onPrevTrack,
  onNextTrack,
  onChangeMusicVolume,
  onToggleMute,
  onUploadQuickTracks,
}: MusicControlsBarProps) {
  const [showVolume, setShowVolume] = useState(false);

  const counterText =
    playback.musicStyle === 'mi_musica' && playback.playlistCount > 0
      ? `${playback.activeTrackIndex + 1}/${playback.playlistCount}`
      : null;

  const handleQuickUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0 && onUploadQuickTracks) {
      onUploadQuickTracks(files);
    }
    e.target.value = '';
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-xl bg-[#090f1a]/92 border border-white/15 text-white shadow-lg ${
        compact ? 'px-2 py-1.5' : 'px-3 py-1.5'
      }`}
    >
      <Music className="w-3.5 h-3.5 text-sky-400 shrink-0 hidden sm:block" />

      <div className={`min-w-0 ${compact ? 'max-w-[115px] sm:max-w-[165px]' : 'max-w-[155px] sm:max-w-[210px]'}`}>
        <div className="text-[11px] font-bold text-slate-100 truncate leading-tight">
          {playback.activeTrackTitle}
        </div>
        {counterText && (
          <div className="text-[10px] font-score text-sky-300 leading-none mt-0.5">
            Pista {counterText} · Offline
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onPrevTrack}
          aria-label="Canción anterior"
          title="Canción anterior"
          className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg hover:bg-white/15 text-slate-200 transition-colors cursor-pointer"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onTogglePlayPause}
          aria-label={playback.isPlaying ? 'Pausar música' : 'Reproducir música'}
          title={playback.isPlaying ? 'Pausar música' : 'Reproducir música'}
          className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-[#00a8e8] hover:bg-[#0ea5e9] text-slate-950 transition-colors cursor-pointer"
        >
          {playback.isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
        </button>

        <button
          type="button"
          onClick={onNextTrack}
          aria-label="Siguiente canción"
          title="Siguiente canción"
          className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg hover:bg-white/15 text-slate-200 transition-colors cursor-pointer"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {onUploadQuickTracks && !compact && (
        <label
          title="Subir pistas MP3/WAV offline"
          className="min-h-[30px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/18 hover:bg-amber-400/30 border border-amber-300/35 text-amber-200 text-[11px] font-bold cursor-pointer whitespace-nowrap shrink-0"
        >
          <Upload className="w-3 h-3 shrink-0" />
          <span>Subir Pista</span>
          <input
            type="file"
            multiple
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
            className="hidden"
            onChange={handleQuickUpload}
          />
        </label>
      )}

      <div className="relative flex items-center gap-1.5 shrink-0 border-l border-white/15 pl-1.5">
        <button
          type="button"
          onClick={() => (compact ? setShowVolume((v) => !v) : onToggleMute())}
          aria-label={muted ? 'Activar música' : 'Volumen de música'}
          title="Volumen de música"
          className="min-w-[30px] min-h-[30px] flex items-center justify-center rounded-lg hover:bg-white/12 text-sky-300 transition-colors cursor-pointer"
        >
          {muted || musicVolume <= 0.01 ? (
            <VolumeX className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </button>

        {!compact && (
          <input
            type="range"
            min={0}
            max={100}
            aria-label="Volumen de música"
            value={muted ? 0 : Math.round(musicVolume * 100)}
            onChange={(e) => {
              const next = Number(e.target.value) / 100;
              if (muted && next > 0) onToggleMute();
              onChangeMusicVolume(next);
            }}
            className="w-16 sm:w-20 accent-[#00a8e8] cursor-pointer"
          />
        )}

        {compact && showVolume && (
          <div className="absolute bottom-full right-0 mb-2 p-2.5 rounded-xl bg-[#0b1322] border border-white/20 shadow-2xl flex items-center gap-2 z-30">
            <button
              type="button"
              onClick={onToggleMute}
              className="text-[11px] font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-white cursor-pointer"
            >
              {muted ? 'Activar' : 'Mute'}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              aria-label="Volumen de música"
              value={muted ? 0 : Math.round(musicVolume * 100)}
              onChange={(e) => {
                const next = Number(e.target.value) / 100;
                if (muted && next > 0) onToggleMute();
                onChangeMusicVolume(next);
              }}
              className="w-24 accent-[#00a8e8] cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
}

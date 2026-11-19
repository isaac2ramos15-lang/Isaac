import { Play, RotateCcw, Home } from 'lucide-react';
import type { MusicPlaybackSnapshot } from '../audio/soundEngine';
import { CITY_CATALOG } from '../data/catalog';
import type { CityId } from '../types/game';
import { MusicControlsBar } from './MusicControlsBar';

interface PauseModalProps {
  city: CityId;
  playback: MusicPlaybackSnapshot;
  musicVolume: number;
  muted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  onTogglePlayPause: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onChangeMusicVolume: (volume: number) => void;
  onToggleMute: () => void;
}

export function PauseModal({
  city,
  playback,
  musicVolume,
  muted,
  onResume,
  onRestart,
  onMenu,
  onTogglePlayPause,
  onPrevTrack,
  onNextTrack,
  onChangeMusicVolume,
  onToggleMute,
}: PauseModalProps) {
  const cityName = CITY_CATALOG.find((c) => c.id === city)?.name ?? 'Tegucigalpa';

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-[#070d16]/82">
      <div className="w-full max-w-sm rounded-2xl bg-[#0b1322] border border-white/15 p-6 shadow-2xl text-center">
        <div className="text-xs font-semibold uppercase tracking-wider text-sky-300 mb-1">
          {cityName} · Honduras
        </div>
        <h2 className="font-display text-3xl font-extrabold text-white">Juego en Pausa</h2>
        <p className="mt-2 text-sm text-slate-300">Tómate un respiro y vuelve a la carrera.</p>

        <div className="mt-4 flex justify-center">
          <MusicControlsBar
            playback={playback}
            musicVolume={musicVolume}
            muted={muted}
            onTogglePlayPause={onTogglePlayPause}
            onPrevTrack={onPrevTrack}
            onNextTrack={onNextTrack}
            onChangeMusicVolume={onChangeMusicVolume}
            onToggleMute={onToggleMute}
          />
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00a8e8] hover:bg-[#0ea5e9] text-slate-950 font-display font-bold text-base transition-colors cursor-pointer whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Continuar</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reiniciar Recorrido</span>
          </button>

          <button
            type="button"
            onClick={onMenu}
            className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-transparent hover:bg-white/10 border border-white/15 text-slate-200 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <Home className="w-4 h-4" />
            <span>Menú Principal</span>
          </button>
        </div>
      </div>
    </div>
  );
}

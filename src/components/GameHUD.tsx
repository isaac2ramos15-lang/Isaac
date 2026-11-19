import { Pause, Volume2, VolumeX } from 'lucide-react';
import type { MusicPlaybackSnapshot } from '../audio/soundEngine';
import { CITY_CATALOG } from '../data/catalog';
import type { HudState } from '../types/game';
import { Coin5CSvg, ShieldLifeSvg } from './GameIcons';
import { MusicControlsBar } from './MusicControlsBar';

interface GameHUDProps {
  hud: HudState;
  muted: boolean;
  playback: MusicPlaybackSnapshot;
  musicVolume: number;
  onToggleMute: () => void;
  onPause: () => void;
  onTogglePlayPause: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onChangeMusicVolume: (volume: number) => void;
}

export function GameHUD({
  hud,
  muted,
  playback,
  musicVolume,
  onToggleMute,
  onPause,
  onTogglePlayPause,
  onPrevTrack,
  onNextTrack,
  onChangeMusicVolume,
}: GameHUDProps) {
  const cityName = CITY_CATALOG.find((c) => c.id === hud.city)?.name ?? 'Tegucigalpa';
  const toneClasses =
    hud.feedbackTone === 'green'
      ? 'bg-emerald-950/92 border-emerald-400/50 text-emerald-200'
      : hud.feedbackTone === 'red'
        ? 'bg-rose-950/92 border-rose-400/50 text-rose-200'
        : 'bg-[#090f1a]/92 border-amber-400/50 text-amber-200';

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#090f1a]/90 border border-white/15">
            {Array.from({ length: hud.maxLives }).map((_, idx) => (
              <ShieldLifeSvg key={idx} className="w-6 h-6 sm:w-7 sm:h-7" active={idx < hud.lives} />
            ))}
            <span className="ml-1 text-xs font-semibold text-slate-300 hidden sm:inline">
              Resistencia
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#090f1a]/88 border border-white/10 text-xs text-slate-200">
            <span className="font-semibold text-sky-300">{cityName}</span>
            <span aria-hidden="true" className="text-white/30">·</span>
            <span className="font-score font-bold text-white">{hud.distance} m</span>
            <span aria-hidden="true" className="text-white/30">·</span>
            <span className="font-score text-amber-300">{hud.speedKmh} km/h</span>
            {hud.onVehicleRoof && (
              <>
                <span aria-hidden="true" className="text-white/30">·</span>
                <span className="font-display font-bold uppercase tracking-wider text-emerald-300">
                  Sobre Techo
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2 sm:gap-3 pointer-events-auto">
          <div className="flex items-center gap-3 sm:gap-4 px-3.5 py-2 rounded-xl bg-[#090f1a]/90 border border-white/15">
            <div className="text-right">
              <div className="text-[11px] font-medium text-slate-300 leading-none">Puntos</div>
              <div className="font-score text-lg sm:text-2xl font-bold text-white leading-tight">
                {hud.score.toLocaleString('es-HN')}
              </div>
            </div>

            <div className="h-7 w-px bg-white/15" />

            <div className="flex items-center gap-1.5">
              <Coin5CSvg className="w-6 h-6 shrink-0" />
              <span className="font-score text-base sm:text-lg font-bold text-amber-300">
                {hud.runCoins}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#090f1a]/90 hover:bg-[#132238] border border-white/15 text-white transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-5 h-5 text-amber-400" /> : <Volume2 className="w-5 h-5 text-sky-400" />}
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pausar juego"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#090f1a]/90 hover:bg-[#132238] border border-white/15 text-white transition-colors cursor-pointer"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 pb-1">
        <div className="pointer-events-auto">
          <MusicControlsBar
            playback={playback}
            musicVolume={musicVolume}
            muted={muted}
            compact
            onTogglePlayPause={onTogglePlayPause}
            onPrevTrack={onPrevTrack}
            onNextTrack={onNextTrack}
            onChangeMusicVolume={onChangeMusicVolume}
            onToggleMute={onToggleMute}
          />
        </div>

        <div className="flex-1 flex justify-center">
          {hud.feedbackText && (
            <div
              key={hud.feedbackSeq}
              className={`px-4 py-2 rounded-xl border text-xs sm:text-sm font-display font-bold tracking-wide shadow-lg ${toneClasses}`}
            >
              {hud.feedbackText}
            </div>
          )}
        </div>

        <div className="w-8 hidden sm:block" />
      </div>
    </div>
  );
}

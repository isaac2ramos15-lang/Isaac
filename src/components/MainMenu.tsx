import {
  Play,
  Users,
  ShoppingBag,
  Wrench,
  Settings,
  Trophy,
  Info,
  Volume2,
  VolumeX,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  MapPin,
} from 'lucide-react';
import type { MusicPlaybackSnapshot } from '../audio/soundEngine';
import { CITY_CATALOG } from '../data/catalog';
import type { MenuModalId, PlayerProgress } from '../types/game';
import { Coin5CSvg } from './GameIcons';
import { MusicControlsBar } from './MusicControlsBar';
import { PWAInstallButton } from './PWAInstallButton';

interface MainMenuProps {
  progress: PlayerProgress;
  muted: boolean;
  playback: MusicPlaybackSnapshot;
  onToggleMute: () => void;
  onTogglePlayPause: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onChangeMusicVolume: (volume: number) => void;
  onUploadQuickTracks: (files: File[]) => void;
  onPlay: () => void;
  onOpenModal: (modal: MenuModalId) => void;
}

export function MainMenu({
  progress,
  muted,
  playback,
  onToggleMute,
  onTogglePlayPause,
  onPrevTrack,
  onNextTrack,
  onChangeMusicVolume,
  onUploadQuickTracks,
  onPlay,
  onOpenModal,
}: MainMenuProps) {
  const activeCity = CITY_CATALOG.find((c) => c.id === progress.selectedCity) ?? CITY_CATALOG[0];

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-7 pointer-events-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 pointer-events-auto">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-white/95 bg-[#090f1a]/90 px-4 py-2 rounded-xl border border-white/15">
          <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="font-semibold">{activeCity.name}</span>
          <span aria-hidden="true" className="text-white/30 hidden sm:inline">·</span>
          <span className="hidden sm:inline text-slate-300">Copán · Guacamayas · 3 Carriles</span>
        </div>

        <div className="flex items-center gap-2.5">
          <PWAInstallButton />

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#090f1a]/90 border border-white/15">
            <Coin5CSvg className="w-5 h-5" />
            <span className="font-score text-sm sm:text-base font-bold text-amber-300">
              {progress.coinsWallet.toLocaleString('es-HN')}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#090f1a]/90 hover:bg-[#132238] text-white border border-white/15 transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-5 h-5 text-amber-400" /> : <Volume2 className="w-5 h-5 text-sky-400" />}
          </button>
        </div>
      </div>

      {/* Main Title & AAA Menu Panel */}
      <div className="my-auto mx-auto w-full max-w-2xl pointer-events-auto">
        <div className="rounded-2xl bg-[#090f1a]/92 border border-white/15 p-5 sm:p-7 shadow-2xl">
          <div className="text-center">
            <div className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] text-sky-300 uppercase mb-1.5">
              Honduras Endless Runner 3D
            </div>

            <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-none">
              RUTA <span className="text-[#38bdf8]">CATRACHA</span>
            </h1>

            <p className="mt-2 text-xs sm:text-sm font-bold tracking-wider uppercase text-amber-300">
              CREADO POR ISAAC RAMOS
            </p>
          </div>

          {/* Primary Play CTA */}
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={onPlay}
              className="w-full sm:w-auto min-w-[220px] min-h-[50px] inline-flex items-center justify-center gap-2.5 px-10 py-3 rounded-xl bg-[#00a8e8] hover:bg-[#0ea5e9] active:scale-[0.98] text-slate-950 font-display font-extrabold text-xl tracking-wide transition-all shadow-lg cursor-pointer whitespace-nowrap"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>JUGAR</span>
            </button>
          </div>

          {/* 6 Secondary Menu Navigation Items: PERSONAJES, TIENDA, GARAGE, CONFIGURACIÓN, RÉCORDS, CRÉDITOS */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => onOpenModal('characters')}
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 text-white text-xs sm:text-sm font-bold tracking-wide transition-colors cursor-pointer whitespace-nowrap"
            >
              <Users className="w-4 h-4 text-sky-300 shrink-0" />
              <span>PERSONAJES</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal('shop')}
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 text-white text-xs sm:text-sm font-bold tracking-wide transition-colors cursor-pointer whitespace-nowrap"
            >
              <ShoppingBag className="w-4 h-4 text-amber-300 shrink-0" />
              <span>TIENDA</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal('garage')}
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 text-white text-xs sm:text-sm font-bold tracking-wide transition-colors cursor-pointer whitespace-nowrap"
            >
              <Wrench className="w-4 h-4 text-teal-300 shrink-0" />
              <span>GARAGE</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal('settings')}
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 text-white text-xs sm:text-sm font-bold tracking-wide transition-colors cursor-pointer whitespace-nowrap"
            >
              <Settings className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>CONFIGURACIÓN</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal('records')}
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 text-white text-xs sm:text-sm font-bold tracking-wide transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trophy className="w-4 h-4 text-yellow-300 shrink-0" />
              <span>RÉCORDS</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenModal('credits')}
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 text-white text-xs sm:text-sm font-bold tracking-wide transition-colors cursor-pointer whitespace-nowrap"
            >
              <Info className="w-4 h-4 text-rose-300 shrink-0" />
              <span>CRÉDITOS</span>
            </button>
          </div>

          {/* Stats & Controls Strip */}
          <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <span>
                Récord:{' '}
                <strong className="font-score text-amber-300">
                  {progress.highScore.toLocaleString('es-HN')}
                </strong>
              </span>
              <span aria-hidden="true" className="text-white/30">·</span>
              <span>
                Mejor distancia: <strong className="font-score text-white">{progress.bestDistance} m</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <ArrowLeft className="w-3.5 h-3.5 text-sky-300" />
              <ArrowRight className="w-3.5 h-3.5 text-sky-300" />
              <ArrowUp className="w-3.5 h-3.5 text-sky-300" />
              <ArrowDown className="w-3.5 h-3.5 text-sky-300" />
              <span>Flechas en Windows o deslizar en Android</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Honduran Horizon + Music Player Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pointer-events-auto">
        <MusicControlsBar
          playback={playback}
          musicVolume={progress.settings.musicVolume}
          muted={muted}
          onTogglePlayPause={onTogglePlayPause}
          onPrevTrack={onPrevTrack}
          onNextTrack={onNextTrack}
          onChangeMusicVolume={onChangeMusicVolume}
          onToggleMute={onToggleMute}
          onUploadQuickTracks={onUploadQuickTracks}
        />

        <div className="px-4 py-1.5 rounded-lg bg-[#090f1a]/88 border border-white/15 text-xs text-slate-200 hidden md:block">
          Tegucigalpa · San Pedro Sula · La Ceiba · Comayagua · Copán Ruinas · Roatán
        </div>
      </div>
    </div>
  );
}

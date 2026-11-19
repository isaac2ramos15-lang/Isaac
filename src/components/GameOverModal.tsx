import { RotateCcw, Home, Trophy, Tv } from 'lucide-react';
import { CITY_CATALOG } from '../data/catalog';
import type { HudState } from '../types/game';
import { Coin5CSvg } from './GameIcons';

interface GameOverModalProps {
  hud: HudState;
  walletTotal: number;
  onRestart: () => void;
  onMenu: () => void;
  onWatchRewardedAd: () => void;
  rewardClaimedThisRun: boolean;
}

export function GameOverModal({
  hud,
  walletTotal,
  onRestart,
  onMenu,
  onWatchRewardedAd,
  rewardClaimedThisRun,
}: GameOverModalProps) {
  const isNewRecord = hud.score > 0 && hud.score >= hud.highScore;
  const cityName = CITY_CATALOG.find((c) => c.id === hud.city)?.name ?? 'Tegucigalpa';

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-[#070d16]/88">
      <div className="w-full max-w-md rounded-2xl bg-[#0b1322] border border-white/15 p-6 sm:p-7 shadow-2xl text-center">
        <div className="text-xs font-semibold uppercase tracking-wider text-rose-300 mb-1">
          Fin del Recorrido · {cityName}
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
          ¡Te Detuvieron en la Ruta!
        </h2>

        {isNewRecord && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300">
            <Trophy className="w-4 h-4" />
            <span>Nuevo récord personal</span>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
            <div className="text-xs text-slate-300">Puntuación</div>
            <div className="font-score text-2xl font-bold text-white mt-0.5">
              {hud.score.toLocaleString('es-HN')}
            </div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
            <div className="text-xs text-slate-300">Récord Global</div>
            <div className="font-score text-2xl font-bold text-amber-300 mt-0.5">
              {hud.highScore.toLocaleString('es-HN')}
            </div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-300">Monedas 5¢</div>
              <div className="font-score text-xl font-bold text-amber-300 mt-0.5">+{hud.runCoins}</div>
            </div>
            <Coin5CSvg className="w-7 h-7" />
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
            <div className="text-xs text-slate-300">Distancia</div>
            <div className="font-score text-xl font-bold text-sky-300 mt-0.5">{hud.distance} m</div>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-300">
          Total acumulado en alcancía:{' '}
          <strong className="font-score text-amber-300">{walletTotal.toLocaleString('es-HN')} 5¢</strong>
        </div>

        {!rewardClaimedThisRun && (
          <button
            type="button"
            onClick={onWatchRewardedAd}
            className="mt-4 w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            <Tv className="w-4 h-4 shrink-0" />
            <span>Ver anuncio de prueba (+50 monedas 5¢)</span>
          </button>
        )}

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="min-h-[46px] flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00a8e8] hover:bg-[#0ea5e9] text-slate-950 font-display font-extrabold text-base transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Volver a Jugar</span>
          </button>

          <button
            type="button"
            onClick={onMenu}
            className="min-h-[46px] flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <Home className="w-4 h-4" />
            <span>Menú Principal</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import { X, Trophy, MapPin } from 'lucide-react';
import { CITY_CATALOG } from '../data/catalog';
import type { PlayerProgress } from '../types/game';
import { Coin5CSvg } from './GameIcons';

interface RecordsModalProps {
  progress: PlayerProgress;
  onClose: () => void;
}

export function RecordsModal({ progress, onClose }: RecordsModalProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-6 bg-[#070d16]/86">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0b1322] border border-white/15 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-white">Récords Catrachos</h2>
            <p className="text-xs text-slate-300">Historial personal y mejores marcas por ciudad</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar récords"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/8 hover:bg-white/15 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Global Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <Trophy className="w-3.5 h-3.5 text-amber-300" />
                <span>Puntuación Máxima</span>
              </div>
              <div className="font-score text-2xl font-bold text-amber-300 mt-1">
                {progress.highScore.toLocaleString('es-HN')}
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-slate-300">Mejor Distancia</div>
              <div className="font-score text-2xl font-bold text-sky-300 mt-1">
                {progress.bestDistance.toLocaleString('es-HN')} m
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-300">Monedas Históricas</div>
                <div className="font-score text-xl font-bold text-white mt-1">
                  {progress.totalCoinsCollected.toLocaleString('es-HN')}
                </div>
              </div>
              <Coin5CSvg className="w-7 h-7" />
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="text-xs text-slate-300">Carreras Completadas</div>
              <div className="font-score text-xl font-bold text-emerald-300 mt-1">
                {progress.totalRuns.toLocaleString('es-HN')}
              </div>
            </div>
          </div>

          {/* Per-city scores */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-300 mb-2.5">
              Mejores Marcas por Ciudad
            </h3>
            <div className="space-y-2">
              {CITY_CATALOG.map((city) => {
                const unlocked = progress.unlockedCities.includes(city.id);
                const best = progress.cityBestScores[city.id] ?? 0;
                return (
                  <div
                    key={city.id}
                    className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-white">{city.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {unlocked ? 'Ruta desbloqueada' : `Requiere ${city.minBestDistance} m`}
                        </div>
                      </div>
                    </div>
                    <div className="font-score text-base font-bold text-amber-300">
                      {best.toLocaleString('es-HN')} pts
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

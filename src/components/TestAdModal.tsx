import { useEffect, useState } from 'react';
import { Tv, X } from 'lucide-react';
import type { AdPlacement } from '../services/monetization';

interface TestAdModalProps {
  placement: AdPlacement;
  onComplete: (rewarded: boolean) => void;
}

export function TestAdModal({ placement, onComplete }: TestAdModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(placement === 'interstitial_gameover' ? 3 : 4);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const isRewarded = placement !== 'interstitial_gameover';
  const rewardAmount = placement === 'rewarded_coins' ? '+100 monedas de 5¢' : '+50 monedas de 5¢';

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-[#040a14]/90">
      <div className="w-full max-w-md rounded-2xl bg-[#0f1f36] border border-amber-400/40 p-6 text-center shadow-2xl">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
          <Tv className="w-4 h-4" />
          <span>Anuncio de Prueba · Modo Desarrollo</span>
        </div>

        <h3 className="font-display text-2xl font-extrabold text-white">
          {isRewarded ? 'Anuncio Recompensado' : 'Espacio Intersticial Moderado'}
        </h3>

        <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {isRewarded
            ? `Recompensa preparada para la app móvil: ${rewardAmount} al finalizar el contador.`
            : 'Este espacio representa un anuncio intersticial de prueba entre partidas (desactivable con "Eliminar Anuncios").'}
        </p>

        <div className="mt-5 py-6 px-4 rounded-xl bg-white/5 border border-white/10">
          <div className="font-score text-4xl font-bold text-amber-300">
            {secondsLeft > 0 ? `${secondsLeft}s` : 'Listo'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {secondsLeft > 0 ? 'Espera un momento...' : 'Puedes cerrar el anuncio de prueba'}
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          {secondsLeft <= 0 ? (
            <button
              type="button"
              onClick={() => onComplete(isRewarded)}
              className="min-h-[44px] w-full rounded-xl bg-[#00a8e8] hover:bg-[#0294cc] text-slate-950 font-display font-bold text-sm cursor-pointer"
            >
              {isRewarded ? `Reclamar ${rewardAmount}` : 'Continuar'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onComplete(false)}
              className="min-h-[44px] w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cerrar sin recompensa</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

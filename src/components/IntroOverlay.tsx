import { FastForward } from 'lucide-react';
import type { IntroCaptionState } from '../types/game';

interface IntroOverlayProps {
  caption: IntroCaptionState | null;
  onSkip: () => void;
}

export function IntroOverlay({ caption, onSkip }: IntroOverlayProps) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 pointer-events-none">
      <div className="flex items-center justify-between gap-4">
        <div className="px-3.5 py-1.5 rounded-lg bg-[#090f1a]/92 border border-white/15 text-xs font-semibold text-sky-300 tracking-wide">
          Tegucigalpa, Honduras {caption ? `· Escena ${caption.step}` : ''}
        </div>

        <button
          type="button"
          onClick={onSkip}
          className="pointer-events-auto min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#090f1a]/92 hover:bg-[#132238] border border-white/20 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
        >
          <span>Saltar</span>
          <FastForward className="w-4 h-4 text-amber-300" />
        </button>
      </div>

      {caption && (
        <div className="mx-auto w-full max-w-2xl mb-2 sm:mb-4">
          <div className="rounded-2xl bg-[#090f1a]/94 border border-white/20 px-5 py-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                {caption.speaker}
              </span>
              <span className="font-score text-[11px] font-semibold text-sky-300">
                {caption.step} / I
              </span>
            </div>
            <p className="text-sm sm:text-base font-medium text-white leading-snug">
              {caption.text}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

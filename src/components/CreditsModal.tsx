import { X } from 'lucide-react';

interface CreditsModalProps {
  onClose: () => void;
}

export function CreditsModal({ onClose }: CreditsModalProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-6 bg-[#070d16]/86">
      <div className="w-full max-w-lg rounded-2xl bg-[#0b1322] border border-white/15 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-white">Créditos</h2>
            <p className="text-xs text-slate-300">RUTA CATRACHA · Producción Original</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar créditos"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/8 hover:bg-white/15 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm text-slate-200">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">
              Creador y Dirección General
            </div>
            <div className="font-display text-2xl font-extrabold text-white mt-1">Isaac Ramos</div>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Videojuego endless runner 3D ambientado en Honduras, iniciando en Tegucigalpa y ampliado a San Pedro Sula, La Ceiba, Comayagua, Copán Ruinas y Roatán, con monedas doradas de cinco centavos, guacamayas rojas, transporte local y más de 20 personajes originales incluyendo a Francisco Morazán.
            </p>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2 text-xs text-slate-300">
            <div className="font-semibold text-white">Arquitectura Multiplataforma y Audio</div>
            <p>· Web 3D: Renderizado Three.js WebGL con iluminación PBR y reflejos PMREM.</p>
            <p>· Audio: Pistas dinámicas PCM por estilo (Punta, Rap, Tropical, Urbana, Cinemática) + manifiesto preparado para stems .mp3 externos en /public/audio/.</p>
            <p>· Android APK / Windows EXE / Safari iOS: Controles táctiles calibrables, teclado configurable y puente preparado para Google Play Billing.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

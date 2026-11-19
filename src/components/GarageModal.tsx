import { useState } from 'react';
import { X, Check, Lock, MapPin, Sparkles } from 'lucide-react';
import {
  ACCESSORY_CATALOG,
  BACKPACK_CATALOG,
  CITY_CATALOG,
  HAT_CATALOG,
  OUTFIT_CATALOG,
  SHOE_CATALOG,
} from '../data/catalog';
import type {
  AccessoryId,
  BackpackId,
  CityId,
  HatId,
  OutfitId,
  PlayerProgress,
  ShoeId,
} from '../types/game';
import { Coin5CSvg } from './GameIcons';

interface GarageModalProps {
  progress: PlayerProgress;
  onClose: () => void;
  onSelectCity: (id: CityId) => void;
  onUnlockCity: (id: CityId, price: number) => void;
  onEquipOutfit: (id: OutfitId) => void;
  onEquipShoes: (id: ShoeId) => void;
  onEquipHat: (id: HatId) => void;
  onEquipBackpack: (id: BackpackId) => void;
  onEquipAccessory: (id: AccessoryId) => void;
  onCelebratePreview: () => void;
  onOpenShop: () => void;
}

type GarageTab = 'cities' | 'gear';

export function GarageModal({
  progress,
  onClose,
  onSelectCity,
  onUnlockCity,
  onEquipOutfit,
  onEquipShoes,
  onEquipHat,
  onEquipBackpack,
  onEquipAccessory,
  onCelebratePreview,
  onOpenShop,
}: GarageModalProps) {
  const [tab, setTab] = useState<GarageTab>('cities');

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-6 bg-[#070d16]/86">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0b1322] border border-white/15 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-white">Garage y Rutas de Honduras</h2>
            <p className="text-xs text-slate-300">
              Selecciona escenario nacional o personaliza el equipo del protagonista en vivo
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <Coin5CSvg className="w-4 h-4" />
              <span className="font-score text-xs font-bold text-amber-300">
                {progress.coinsWallet.toLocaleString('es-HN')}
              </span>
            </div>

            <button
              type="button"
              onClick={onCelebratePreview}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Celebrar 3D</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar garage"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/8 hover:bg-white/15 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-3 bg-white/5 border-b border-white/10">
          <button
            type="button"
            onClick={() => setTab('cities')}
            className={`min-h-[40px] px-4 py-2 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-colors ${
              tab === 'cities'
                ? 'bg-[#00a8e8] text-slate-950'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            Rutas de Honduras (6)
          </button>

          <button
            type="button"
            onClick={() => setTab('gear')}
            className={`min-h-[40px] px-4 py-2 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-colors ${
              tab === 'gear'
                ? 'bg-[#00a8e8] text-slate-950'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            Equipamiento del Protagonista
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {tab === 'cities' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CITY_CATALOG.map((city) => {
                const unlocked = progress.unlockedCities.includes(city.id);
                const selected = progress.selectedCity === city.id;
                const meetsDist = progress.bestDistance >= city.minBestDistance;
                const canAfford = progress.coinsWallet >= city.unlockCost;
                const canUnlock = !unlocked && meetsDist && canAfford;

                return (
                  <div
                    key={city.id}
                    className={`rounded-xl p-4 border transition-colors ${
                      selected
                        ? 'bg-sky-500/15 border-sky-400/50'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-sky-300 shrink-0" />
                        <h3 className="font-display text-lg font-bold text-white">{city.name}</h3>
                      </div>
                      {selected && <Check className="w-4 h-4 text-emerald-300 shrink-0" />}
                    </div>

                    <div className="text-[11px] font-semibold text-sky-300 mt-0.5">{city.region}</div>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{city.description}</p>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        Récord local:{' '}
                        <strong className="font-score text-white">
                          {(progress.cityBestScores[city.id] ?? 0).toLocaleString('es-HN')}
                        </strong>
                      </span>
                      {!unlocked && (
                        <span className="text-amber-300 font-medium">
                          Req: {city.minBestDistance} m
                        </span>
                      )}
                    </div>

                    <div className="mt-3">
                      {unlocked ? (
                        <button
                          type="button"
                          disabled={selected}
                          onClick={() => onSelectCity(city.id)}
                          className={`min-h-[40px] w-full rounded-lg text-xs font-bold transition-colors ${
                            selected
                              ? 'bg-emerald-500/20 text-emerald-200 cursor-default'
                              : 'bg-[#00a8e8] hover:bg-[#0ea5e9] text-slate-950 cursor-pointer'
                          }`}
                        >
                          {selected ? 'Escenario Activo' : 'Seleccionar Ruta'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canUnlock}
                          onClick={() => onUnlockCity(city.id, city.unlockCost)}
                          className={`min-h-[40px] w-full inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors ${
                            canUnlock
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                              : 'bg-white/10 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {!meetsDist && <Lock className="w-3.5 h-3.5" />}
                          <Coin5CSvg className="w-4 h-4" />
                          <span>{city.unlockCost} · Desbloquear Ciudad</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'gear' && (
            <div className="space-y-5">
              {progress.equippedCharacter !== 'protagonist' && (
                <div className="rounded-xl bg-amber-500/12 border border-amber-400/35 px-4 py-3 text-xs text-amber-200">
                  Nota: Al seleccionar una vestimenta, calzado, gorra o mochila aquí se activará automáticamente el Protagonista Urbano para mostrar la personalización.
                </div>
              )}

              {/* Outfits */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-300 mb-2">
                  Vestimentas
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {OUTFIT_CATALOG.map((item) => {
                    const unlocked = progress.unlockedOutfits.includes(item.id);
                    const equipped =
                      progress.equippedCharacter === 'protagonist' && progress.equippedOutfit === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => (unlocked ? onEquipOutfit(item.id) : onOpenShop())}
                        className={`min-h-[52px] p-3 rounded-xl border text-left flex items-center gap-2.5 cursor-pointer transition-colors ${
                          equipped
                            ? 'bg-sky-500/20 border-sky-400/50 text-white'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                        }`}
                      >
                        <span
                          className="w-6 h-6 rounded-md border border-white/20 shrink-0"
                          style={{ backgroundColor: item.swatchHex }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{item.name}</div>
                          <div className="text-[11px] text-slate-300">
                            {equipped ? 'Equipada' : unlocked ? 'Usar' : `Tienda · ${item.priceCoins} 5¢`}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shoes */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-300 mb-2">
                  Zapatos
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SHOE_CATALOG.map((item) => {
                    const unlocked = progress.unlockedShoes.includes(item.id);
                    const equipped =
                      progress.equippedCharacter === 'protagonist' && progress.equippedShoes === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => (unlocked ? onEquipShoes(item.id) : onOpenShop())}
                        className={`min-h-[50px] p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                          equipped
                            ? 'bg-sky-500/20 border-sky-400/50 text-white'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                        }`}
                      >
                        <div className="text-xs font-bold">{item.name}</div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          {equipped ? 'Equipado' : unlocked ? 'Usar' : `${item.priceCoins} 5¢`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hats */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-300 mb-2">
                  Gorras y Sombreros
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {HAT_CATALOG.map((item) => {
                    const unlocked = progress.unlockedHats.includes(item.id);
                    const equipped =
                      progress.equippedCharacter === 'protagonist' && progress.equippedHat === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => (unlocked ? onEquipHat(item.id) : onOpenShop())}
                        className={`min-h-[50px] p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                          equipped
                            ? 'bg-sky-500/20 border-sky-400/50 text-white'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                        }`}
                      >
                        <div className="text-xs font-bold">{item.name}</div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          {equipped ? 'Equipada' : unlocked ? 'Usar' : `${item.priceCoins} 5¢`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Backpacks */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-300 mb-2">
                  Mochilas
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {BACKPACK_CATALOG.map((item) => {
                    const unlocked = progress.unlockedBackpacks.includes(item.id);
                    const equipped =
                      progress.equippedCharacter === 'protagonist' &&
                      progress.equippedBackpack === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => (unlocked ? onEquipBackpack(item.id) : onOpenShop())}
                        className={`min-h-[50px] p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                          equipped
                            ? 'bg-sky-500/20 border-sky-400/50 text-white'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                        }`}
                      >
                        <div className="text-xs font-bold">{item.name}</div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          {equipped ? 'Equipada' : unlocked ? 'Usar' : `${item.priceCoins} 5¢`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accessories */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-300 mb-2">
                  Accesorios
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {ACCESSORY_CATALOG.map((item) => {
                    const unlocked = progress.unlockedAccessories.includes(item.id);
                    const equipped = progress.equippedAccessory === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => (unlocked ? onEquipAccessory(item.id) : onOpenShop())}
                        className={`min-h-[50px] p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                          equipped
                            ? 'bg-sky-500/20 border-sky-400/50 text-white'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                        }`}
                      >
                        <div className="text-xs font-bold">{item.name}</div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          {equipped ? 'Equipado' : unlocked ? 'Usar' : `${item.priceCoins} 5¢`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

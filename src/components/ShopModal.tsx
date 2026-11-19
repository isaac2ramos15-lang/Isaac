import { useState } from 'react';
import { X, Check, Lock, Tv, ShieldCheck, Eye } from 'lucide-react';
import {
  ACCESSORY_CATALOG,
  BACKPACK_CATALOG,
  BILLING_PACKAGES,
  CHARACTER_CATALOG,
  HAT_CATALOG,
  OUTFIT_CATALOG,
  SHOE_CATALOG,
  type GearCatalogItem,
} from '../data/catalog';
import { monetizationService } from '../services/monetization';
import type {
  AccessoryId,
  BackpackId,
  CharacterId,
  HatId,
  OutfitId,
  PlayerProgress,
  ShoeId,
} from '../types/game';
import { Character3DPreview } from './Character3DPreview';
import { Coin5CSvg } from './GameIcons';

interface ShopModalProps {
  progress: PlayerProgress;
  onClose: () => void;
  onBuyCharacter: (id: CharacterId, price: number) => void;
  onEquipCharacter: (id: CharacterId) => void;
  onBuyOutfit: (id: OutfitId, price: number) => void;
  onEquipOutfit: (id: OutfitId) => void;
  onBuyShoes: (id: ShoeId, price: number) => void;
  onEquipShoes: (id: ShoeId) => void;
  onBuyHat: (id: HatId, price: number) => void;
  onEquipHat: (id: HatId) => void;
  onBuyBackpack: (id: BackpackId, price: number) => void;
  onEquipBackpack: (id: BackpackId) => void;
  onBuyAccessory: (id: AccessoryId, price: number) => void;
  onEquipAccessory: (id: AccessoryId) => void;
  onApplyBillingSku: (sku: string) => void;
  onWatchRewardedAd: () => void;
}

type ShopTab =
  | 'characters'
  | 'outfits'
  | 'shoes'
  | 'hats'
  | 'backpacks'
  | 'accessories'
  | 'packages';

export function ShopModal({
  progress,
  onClose,
  onBuyCharacter,
  onEquipCharacter,
  onBuyOutfit,
  onEquipOutfit,
  onBuyShoes,
  onEquipShoes,
  onBuyHat,
  onEquipHat,
  onBuyBackpack,
  onEquipBackpack,
  onBuyAccessory,
  onEquipAccessory,
  onApplyBillingSku,
  onWatchRewardedAd,
}: ShopModalProps) {
  const [tab, setTab] = useState<ShopTab>('characters');
  const [billingNotice, setBillingNotice] = useState<string | null>(null);
  const [previewCharId, setPreviewCharId] = useState<CharacterId>('vendedora_baleadas');

  const previewChar =
    CHARACTER_CATALOG.find((c) => c.id === previewCharId) ?? CHARACTER_CATALOG[1];

  const handleStoreBillingClick = async (sku: string) => {
    const res = await monetizationService.requestStorePurchase(sku);
    if (res.status === 'purchased') {
      onApplyBillingSku(sku);
    }
    setBillingNotice(res.message);
  };

  const handleRestorePurchases = async () => {
    const res = await monetizationService.restorePurchases();
    res.skus.forEach((sku) => onApplyBillingSku(sku));
    setBillingNotice(res.message);
  };

  const renderGearList = <T extends string>(
    items: GearCatalogItem<T>[],
    unlockedList: T[],
    equippedId: T,
    onBuy: (id: T, price: number) => void,
    onEquip: (id: T) => void,
    requireProtagonistCheck = true,
  ) =>
    items.map((item) => {
      const unlocked = unlockedList.includes(item.id);
      const equipped =
        (!requireProtagonistCheck || progress.equippedCharacter === 'protagonist') &&
        equippedId === item.id;
      const canAfford = progress.coinsWallet >= item.priceCoins;

      return (
        <div
          key={item.id}
          className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-lg border border-white/20 shrink-0 mt-0.5"
              style={{ backgroundColor: item.swatchHex }}
            />
            <div>
              <h3 className="font-display text-base font-bold text-white">{item.name}</h3>
              <p className="text-xs text-slate-300 mt-1">{item.description}</p>
            </div>
          </div>

          <div className="shrink-0">
            {equipped ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold whitespace-nowrap">
                <Check className="w-4 h-4" />
                <span>Equipado</span>
              </span>
            ) : unlocked ? (
              <button
                type="button"
                onClick={() => onEquip(item.id)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#00a8e8] hover:bg-[#0ea5e9] text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap"
              >
                Equipar
              </button>
            ) : (
              <button
                type="button"
                disabled={!canAfford}
                onClick={() => onBuy(item.id, item.priceCoins)}
                className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  canAfford
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                    : 'bg-white/10 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Coin5CSvg className="w-4 h-4" />
                <span>{item.priceCoins} · Comprar</span>
              </button>
            )}
          </div>
        </div>
      );
    });

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-6 bg-[#070d16]/86">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0b1322] border border-white/15 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-white">Tienda Catracha</h2>
            <p className="text-xs text-slate-300">
              Personajes 3D, vestimentas, zapatos, gorras, mochilas y accesorios
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <Coin5CSvg className="w-5 h-5" />
              <span className="font-score text-sm font-bold text-amber-300">
                {progress.coinsWallet.toLocaleString('es-HN')}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar tienda"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/8 hover:bg-white/15 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-5 py-3 bg-white/5 border-b border-white/10 overflow-x-auto">
          {(
            [
              ['characters', `Personajes (${CHARACTER_CATALOG.length})`],
              ['outfits', 'Vestimentas'],
              ['shoes', 'Zapatos'],
              ['hats', 'Gorras'],
              ['backpacks', 'Mochilas'],
              ['accessories', 'Accesorios'],
              ['packages', 'Monedas / Play Billing'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setBillingNotice(null);
                setTab(id);
              }}
              className={`min-h-[38px] px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                tab === id
                  ? 'bg-[#00a8e8] text-slate-950 font-bold'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto space-y-3">
          {tab === 'characters' && (
            <>
              <Character3DPreview
                characterOptions={{
                  characterId: previewChar.id,
                  outfitId: progress.equippedOutfit,
                  shoeId: progress.equippedShoes,
                  hatId: progress.equippedHat,
                  backpackId: progress.equippedBackpack,
                  accessoryId: progress.equippedAccessory,
                }}
                label={previewChar.name}
                subtitle={previewChar.role}
              />

              {CHARACTER_CATALOG.map((char) => {
                const unlocked = progress.unlockedCharacters.includes(char.id);
                const equipped = progress.equippedCharacter === char.id;
                const isInspected = previewCharId === char.id;
                const isFeaturedBaleadas = char.id === 'vendedora_baleadas';
                const meetsDistance = progress.bestDistance >= char.minBestDistance;
                const canAfford = progress.coinsWallet >= char.priceCoins;
                const canBuy = !unlocked && meetsDistance && canAfford;

                return (
                  <div
                    key={char.id}
                    className={`rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                      isFeaturedBaleadas
                        ? 'bg-sky-500/12 border-sky-400/45'
                        : isInspected
                          ? 'bg-white/10 border-sky-400/35'
                          : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-sm border border-white/25 shrink-0"
                          style={{
                            backgroundColor: `#${char.appearance.torsoHex.toString(16).padStart(6, '0')}`,
                          }}
                        />
                        <h3 className="font-display text-lg font-bold text-white">{char.name}</h3>
                        {isFeaturedBaleadas && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[10px] font-extrabold uppercase tracking-wider">
                            Nuevo Activo 3D
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-sky-300 mt-0.5">
                        {char.category} · {char.role}
                      </div>
                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{char.description}</p>
                      {!unlocked && (
                        <div className="mt-2 text-xs text-amber-300 font-medium">
                          {char.priceCoins === 0
                            ? 'Disponible gratis en la tienda · Desbloquéalo y juega al instante'
                            : `Requisito: ${char.minBestDistance} m · Tu mejor marca: ${progress.bestDistance} m`}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewCharId(char.id)}
                        title="Inspeccionar modelo 3D"
                        className={`min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer whitespace-nowrap ${
                          isInspected
                            ? 'bg-sky-500/25 border-sky-400/50 text-sky-200'
                            : 'bg-white/8 hover:bg-white/15 border-white/15 text-slate-200'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver 3D</span>
                      </button>

                      {equipped ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold whitespace-nowrap">
                          <Check className="w-4 h-4" />
                          <span>Equipado</span>
                        </span>
                      ) : unlocked ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewCharId(char.id);
                            onEquipCharacter(char.id);
                          }}
                          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#00a8e8] hover:bg-[#0ea5e9] text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap"
                        >
                          Seleccionar
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canBuy}
                          onClick={() => {
                            setPreviewCharId(char.id);
                            onBuyCharacter(char.id, char.priceCoins);
                          }}
                          className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                            canBuy
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                              : 'bg-white/10 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {!meetsDistance && <Lock className="w-3.5 h-3.5" />}
                          {char.priceCoins > 0 && <Coin5CSvg className="w-4 h-4" />}
                          <span>
                            {char.priceCoins === 0
                              ? 'Adquirir Gratis y Usar'
                              : `${char.priceCoins} · Desbloquear`}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {tab === 'outfits' &&
            renderGearList(
              OUTFIT_CATALOG,
              progress.unlockedOutfits,
              progress.equippedOutfit,
              onBuyOutfit,
              onEquipOutfit,
            )}

          {tab === 'shoes' &&
            renderGearList(
              SHOE_CATALOG,
              progress.unlockedShoes,
              progress.equippedShoes,
              onBuyShoes,
              onEquipShoes,
            )}

          {tab === 'hats' &&
            renderGearList(
              HAT_CATALOG,
              progress.unlockedHats,
              progress.equippedHat,
              onBuyHat,
              onEquipHat,
            )}

          {tab === 'backpacks' &&
            renderGearList(
              BACKPACK_CATALOG,
              progress.unlockedBackpacks,
              progress.equippedBackpack,
              onBuyBackpack,
              onEquipBackpack,
            )}

          {tab === 'accessories' &&
            renderGearList(
              ACCESSORY_CATALOG,
              progress.unlockedAccessories,
              progress.equippedAccessory,
              onBuyAccessory,
              onEquipAccessory,
              false,
            )}

          {tab === 'packages' && (
            <div className="space-y-3">
              <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-base font-bold text-amber-200">
                    Anuncio Recompensado (Modo Prueba)
                  </h3>
                  <p className="text-xs text-slate-200 mt-1">
                    Recibe +100 monedas de cinco centavos viendo un anuncio de prueba local.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onWatchRewardedAd}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Tv className="w-4 h-4" />
                  <span>+100 Monedas 5¢</span>
                </button>
              </div>

              {billingNotice && (
                <div className="rounded-xl bg-sky-950/90 border border-sky-400/40 p-3.5 text-xs text-sky-100 leading-relaxed">
                  {billingNotice}
                </div>
              )}

              {BILLING_PACKAGES.map((pkg) => (
                <div
                  key={pkg.sku}
                  className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-sky-300 shrink-0" />
                      <h3 className="font-display text-base font-bold text-white">{pkg.title}</h3>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{pkg.description}</p>
                    <div className="text-[11px] text-slate-400 mt-1 font-mono">SKU: {pkg.sku}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStoreBillingClick(pkg.sku)}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {pkg.displayPriceNote}
                  </button>
                </div>
              ))}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleRestorePurchases()}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-xs font-semibold text-sky-300 cursor-pointer"
                >
                  Restaurar compras de Google Play
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

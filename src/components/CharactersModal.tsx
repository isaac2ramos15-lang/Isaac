import { useState, type ChangeEvent } from 'react';
import { X, Check, Sparkles, Upload, Trash2, Lock, Eye } from 'lucide-react';
import { CHARACTER_CATALOG, type CharacterCatalogItem } from '../data/catalog';
import type { CharacterId, PlayerProgress } from '../types/game';
import { Character3DPreview } from './Character3DPreview';

interface CharactersModalProps {
  progress: PlayerProgress;
  onClose: () => void;
  onEquipCharacter: (id: CharacterId) => void;
  onCelebratePreview: () => void;
  onUploadPhoto: (dataUrl: string | null) => void;
  onOpenShop: () => void;
}

const CATEGORIES: ('Todos' | CharacterCatalogItem['category'])[] = [
  'Todos',
  'Protagonista',
  'Histórico',
  'Estudiante',
  'Futbolista',
  'Policía',
  'Conductor',
  'Comerciante',
  'Motociclista',
  'Trabajador',
  'Deportista',
  'Explorador',
];

export function CharactersModal({
  progress,
  onClose,
  onEquipCharacter,
  onCelebratePreview,
  onUploadPhoto,
  onOpenShop,
}: CharactersModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<'Todos' | CharacterCatalogItem['category']>(
    'Todos',
  );
  const [previewCharId, setPreviewCharId] = useState<CharacterId>(progress.equippedCharacter);

  const previewChar =
    CHARACTER_CATALOG.find((c) => c.id === previewCharId) ?? CHARACTER_CATALOG[0];

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const visibleCharacters =
    selectedCategory === 'Todos'
      ? CHARACTER_CATALOG
      : CHARACTER_CATALOG.filter((c) => c.category === selectedCategory);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-6 bg-[#070d16]/86">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0b1322] border border-white/15 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-white">
              Personajes ({CHARACTER_CATALOG.length})
            </h2>
            <p className="text-xs text-slate-300">
              Modelos humanos 3D originales con vestimenta realista y animaciones completas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCelebratePreview}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              <span>Celebrar 3D</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar personajes"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/8 hover:bg-white/15 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Filter Strip */}
        <div className="flex items-center gap-1.5 px-5 py-3 bg-white/5 border-b border-white/10 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#00a8e8] text-slate-950 font-bold'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
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

          {/* Reference Photo Upload for Protagonist */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {progress.customPhotoDataUrl ? (
                <img
                  src={progress.customPhotoDataUrl}
                  alt="Fotografía de referencia del protagonista"
                  className="w-12 h-12 rounded-xl object-cover border border-white/20 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-xs font-bold text-sky-200 shrink-0">
                  3D
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-white">Fotografía de Referencia del Protagonista</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  El protagonista no tiene nombre obligatorio. Puedes adjuntar tu fotografía de referencia aquí para guiar la apariencia final.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer whitespace-nowrap">
                <Upload className="w-3.5 h-3.5" />
                <span>Subir Foto</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>

              {progress.customPhotoDataUrl && (
                <button
                  type="button"
                  onClick={() => onUploadPhoto(null)}
                  aria-label="Quitar fotografía"
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Character Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleCharacters.map((char) => {
              const unlocked = progress.unlockedCharacters.includes(char.id);
              const equipped = progress.equippedCharacter === char.id;
              return (
                <div
                  key={char.id}
                  className={`rounded-xl p-4 border transition-colors ${
                    equipped ? 'bg-sky-500/15 border-sky-400/50' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-4 h-4 rounded-sm border border-white/25 shrink-0"
                        style={{
                          backgroundColor: `#${char.appearance.torsoHex.toString(16).padStart(6, '0')}`,
                        }}
                      />
                      <div className="font-display text-lg font-bold text-white truncate">
                        {char.name}
                      </div>
                    </div>
                    {equipped && <Check className="w-4 h-4 text-emerald-300 shrink-0" />}
                  </div>

                  <div className="text-xs text-sky-300 mt-0.5">
                    {char.category} · {char.role}
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{char.description}</p>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewCharId(char.id)}
                      className="min-h-[40px] px-3 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>3D</span>
                    </button>

                    {unlocked ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewCharId(char.id);
                          onEquipCharacter(char.id);
                        }}
                        disabled={equipped}
                        className={`min-h-[40px] flex-1 rounded-lg text-xs font-bold transition-colors ${
                          equipped
                            ? 'bg-emerald-500/20 text-emerald-200 cursor-default'
                            : 'bg-[#00a8e8] hover:bg-[#0ea5e9] text-slate-950 cursor-pointer'
                        }`}
                      >
                        {equipped ? 'Equipado' : 'Equipar Personaje'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onOpenShop}
                        className="min-h-[40px] flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-amber-300 text-xs font-semibold cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>
                          Tienda · {char.priceCoins === 0 ? 'Gratis' : `${char.priceCoins} 5¢`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

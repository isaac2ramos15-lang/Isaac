import { GAME_CONSTANTS, type PlayerProgress } from '../types/game';

export const DEFAULT_PROGRESS: PlayerProgress = {
  coinsWallet: 0,
  totalCoinsCollected: 0,
  highScore: 0,
  bestDistance: 0,
  totalRuns: 0,
  cityBestScores: {
    tegucigalpa: 0,
    san_pedro_sula: 0,
    la_ceiba: 0,
    comayagua: 0,
    copan: 0,
    roatan: 0,
  },
  unlockedCities: ['tegucigalpa'],
  selectedCity: 'tegucigalpa',
  unlockedCharacters: ['protagonist'],
  unlockedOutfits: ['urbano_tegus', 'historico_morazan'],
  unlockedShoes: ['tenis_urbanos'],
  unlockedHats: ['ninguna', 'bicornio'],
  unlockedBackpacks: ['ninguna', 'mochila_urbana'],
  unlockedAccessories: ['ninguno'],
  equippedCharacter: 'protagonist',
  equippedOutfit: 'urbano_tegus',
  equippedShoes: 'tenis_urbanos',
  equippedHat: 'ninguna',
  equippedBackpack: 'mochila_urbana',
  equippedAccessory: 'ninguno',
  adsRemoved: false,
  hasSeenIntro: false,
  customPhotoDataUrl: null,
  settings: {
    musicVolume: 0.72,
    sfxVolume: 0.88,
    ambientVolume: 0.55,
    vehicleVolume: 0.78,
    musicStyle: 'raspe',
    quality: 'high',
    touchSensitivity: 1.0,
    controlScheme: 'both',
    language: 'es',
  },
};

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(GAME_CONSTANTS.PROGRESS_STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_PROGRESS);
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      cityBestScores: {
        ...DEFAULT_PROGRESS.cityBestScores,
        ...(parsed.cityBestScores ?? {}),
      },
      unlockedCities: Array.isArray(parsed.unlockedCities)
        ? parsed.unlockedCities
        : DEFAULT_PROGRESS.unlockedCities,
      unlockedCharacters: Array.isArray(parsed.unlockedCharacters)
        ? parsed.unlockedCharacters
        : DEFAULT_PROGRESS.unlockedCharacters,
      unlockedOutfits: Array.isArray(parsed.unlockedOutfits)
        ? parsed.unlockedOutfits
        : DEFAULT_PROGRESS.unlockedOutfits,
      unlockedShoes: Array.isArray(parsed.unlockedShoes)
        ? parsed.unlockedShoes
        : DEFAULT_PROGRESS.unlockedShoes,
      unlockedHats: Array.isArray(parsed.unlockedHats)
        ? parsed.unlockedHats
        : DEFAULT_PROGRESS.unlockedHats,
      unlockedBackpacks: Array.isArray(parsed.unlockedBackpacks)
        ? parsed.unlockedBackpacks
        : DEFAULT_PROGRESS.unlockedBackpacks,
      unlockedAccessories: Array.isArray(parsed.unlockedAccessories)
        ? parsed.unlockedAccessories
        : DEFAULT_PROGRESS.unlockedAccessories,
      settings: {
        ...DEFAULT_PROGRESS.settings,
        ...(parsed.settings ?? {}),
      },
    };
  } catch {
    return structuredClone(DEFAULT_PROGRESS);
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(GAME_CONSTANTS.PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage limits
  }
}

export function resetProgress(): PlayerProgress {
  const fresh = structuredClone(DEFAULT_PROGRESS);
  saveProgress(fresh);
  return fresh;
}

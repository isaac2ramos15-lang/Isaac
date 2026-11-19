export type GamePhase = 'menu' | 'intro' | 'playing' | 'paused' | 'gameover';

export type MenuModalId =
  | 'none'
  | 'characters'
  | 'shop'
  | 'garage'
  | 'settings'
  | 'records'
  | 'credits';

export type LaneIndex = -1 | 0 | 1;

export type InputAction = 'left' | 'right' | 'jump' | 'duck';

export type CityId =
  | 'tegucigalpa'
  | 'san_pedro_sula'
  | 'la_ceiba'
  | 'comayagua'
  | 'copan'
  | 'roatan';

export type ObstacleKind =
  | 'schoolBus'
  | 'publicBus'
  | 'decoratedBus'
  | 'mototaxi'
  | 'car'
  | 'truck'
  | 'lowBarrier'
  | 'overheadArch';

export type CollectibleKind = 'coin5c';

export type CharacterId =
  | 'protagonist'
  | 'morazan'
  | 'estudiante_unah'
  | 'estudiante_tecnico'
  | 'futbolista_seleccion'
  | 'futbolista_portero'
  | 'policia_municipal'
  | 'policia_transito'
  | 'conductor_rapidito'
  | 'conductor_escolar'
  | 'comerciante_mercado'
  | 'comerciante_cafe'
  | 'motociclista_urbano'
  | 'motociclista_ruta'
  | 'trabajador_obra'
  | 'trabajador_cafe'
  | 'deportista_atleta'
  | 'deportista_ciclista'
  | 'explorador_copan'
  | 'explorador_mosquitia'
  | 'explorador_roatan'
  | 'vendedora_baleadas';

export type OutfitId =
  | 'urbano_tegus'
  | 'azul_nacional'
  | 'ejecutivo_sps'
  | 'safari_copan'
  | 'moto_cuero'
  | 'historico_morazan';

export type ShoeId = 'tenis_urbanos' | 'botas_tacticas' | 'tacos_futbol' | 'botas_campo';

export type HatId = 'ninguna' | 'gorra_catracha' | 'casco_moto' | 'casco_obra' | 'sombrero_junco' | 'bicornio';

export type BackpackId = 'ninguna' | 'mochila_urbana' | 'mochila_reparto' | 'mochila_expedicion';

export type AccessoryId = 'ninguno' | 'lentes_aviador' | 'lentes_deportivos' | 'reloj_tactico';

export type MusicStyle =
  | 'mi_musica'
  | 'todas_las_noches_estuvo'
  | 'sopa_de_caracol'
  | 'tegucigalpa_noche'
  | 'brisa_la_ceiba'
  | 'orgullo_catracho'
  | 'vuelo_guacamaya'
  | 'raspe'
  | 'punta'
  | 'rap'
  | 'tropical'
  | 'urbana'
  | 'cinematica';

export type GraphicsQuality = 'ultra' | 'high' | 'optimized';

export type ControlScheme = 'both' | 'arrows' | 'wasd';

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  vehicleVolume: number;
  musicStyle: MusicStyle;
  quality: GraphicsQuality;
  touchSensitivity: number; // 0.6 .. 1.6
  controlScheme: ControlScheme;
  language: 'es';
}

export interface PlayerProgress {
  coinsWallet: number;
  totalCoinsCollected: number;
  highScore: number;
  bestDistance: number;
  totalRuns: number;
  cityBestScores: Record<CityId, number>;
  unlockedCities: CityId[];
  selectedCity: CityId;
  unlockedCharacters: CharacterId[];
  unlockedOutfits: OutfitId[];
  unlockedShoes: ShoeId[];
  unlockedHats: HatId[];
  unlockedBackpacks: BackpackId[];
  unlockedAccessories: AccessoryId[];
  equippedCharacter: CharacterId;
  equippedOutfit: OutfitId;
  equippedShoes: ShoeId;
  equippedHat: HatId;
  equippedBackpack: BackpackId;
  equippedAccessory: AccessoryId;
  adsRemoved: boolean;
  hasSeenIntro: boolean;
  customPhotoDataUrl: string | null;
  settings: GameSettings;
}

export interface IntroCaptionState {
  step: string; // A..I
  speaker: string;
  text: string;
}

export interface HudState {
  phase: GamePhase;
  city: CityId;
  score: number;
  highScore: number;
  distance: number;
  runCoins: number;
  lives: number;
  maxLives: number;
  speedKmh: number;
  onVehicleRoof: boolean;
  feedbackText: string | null;
  feedbackTone: 'gold' | 'green' | 'red' | null;
  feedbackSeq: number;
  introCaption: IntroCaptionState | null;
}

export const GAME_CONSTANTS = {
  LANE_WIDTH: 3.2,
  MAX_LIVES: 3,
  BASE_SPEED: 17.5,
  MAX_SPEED: 38.0,
  SPEED_RAMP_PER_SEC: 0.25,
  JUMP_VELOCITY: 17.6,
  GRAVITY: 39.0,
  DUCK_DURATION: 0.68,
  INVULN_DURATION: 1.5,
  COIN_SCORE: 50,
  PROGRESS_STORAGE_KEY: 'ruta_catracha_aaa_progress_v3',
} as const;

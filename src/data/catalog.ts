import type {
  AccessoryId,
  BackpackId,
  CharacterId,
  CityId,
  HatId,
  OutfitId,
  ShoeId,
} from '../types/game';

export interface CityCatalogItem {
  id: CityId;
  name: string;
  region: string;
  description: string;
  unlockCost: number;
  minBestDistance: number;
  skyHex: number;
  fogHex: number;
  sunHex: number;
  sunIntensity: number;
  groundHex: number;
  buildingPalette: number[];
  hasOcean: boolean;
  hasMayanRuins: boolean;
}

export interface CharacterCatalogItem {
  id: CharacterId;
  name: string;
  role: string;
  category:
    | 'Protagonista'
    | 'Histórico'
    | 'Estudiante'
    | 'Futbolista'
    | 'Policía'
    | 'Conductor'
    | 'Comerciante'
    | 'Motociclista'
    | 'Trabajador'
    | 'Deportista'
    | 'Explorador';
  description: string;
  priceCoins: number;
  minBestDistance: number;
  appearance: {
    skinHex: number;
    hairHex: number;
    torsoHex: number;
    accentHex: number;
    pantsHex: number;
    shoeHex: number;
    defaultHat: HatId;
    defaultBackpack: BackpackId;
    isJacket?: boolean;
    hasTie?: boolean;
    hasApron?: boolean;
    hasVest?: boolean;
    isHistoric?: boolean;
    isFemale?: boolean;
    hasVendorBasket?: boolean;
  };
}

export interface GearCatalogItem<T extends string> {
  id: T;
  name: string;
  description: string;
  priceCoins: number;
  swatchHex: string;
}

export interface StoreBillingPackage {
  sku: string;
  title: string;
  description: string;
  displayPriceNote: string;
}

export const CITY_CATALOG: CityCatalogItem[] = [
  {
    id: 'tegucigalpa',
    name: 'Tegucigalpa',
    region: 'Francisco Morazán · Escenario Inicial',
    description:
      'Bulevares inclinados, mercados históricos, transporte urbano y las montañas de El Picacho al atardecer.',
    unlockCost: 0,
    minBestDistance: 0,
    skyHex: 0xc2d8eb,
    fogHex: 0xb7cde0,
    sunHex: 0xffe4bd,
    sunIntensity: 2.1,
    groundHex: 0x3b4d2b,
    buildingPalette: [0xb45309, 0x9ca3af, 0xd6d3d1, 0x7c2d12, 0x475569, 0x991b1b],
    hasOcean: false,
    hasMayanRuins: false,
  },
  {
    id: 'san_pedro_sula',
    name: 'San Pedro Sula',
    region: 'Cortés · Capital Industrial',
    description:
      'Amplias avenidas modernas, torres comerciales, palmas reales y el imponente Merendón al fondo.',
    unlockCost: 200,
    minBestDistance: 350,
    skyHex: 0xf4cfb0,
    fogHex: 0xeac2a0,
    sunHex: 0xffd2a6,
    sunIntensity: 2.25,
    groundHex: 0x365314,
    buildingPalette: [0x334155, 0x64748b, 0x94a3b8, 0x1e293b, 0xd97706, 0xe2e8f0],
    hasOcean: false,
    hasMayanRuins: false,
  },
  {
    id: 'la_ceiba',
    name: 'La Ceiba',
    region: 'Atlántida · Costa Caribe',
    description:
      'Brisa marina junto al malecón, palmeras altas, colores vibrantes y la cordillera Nombre de Dios.',
    unlockCost: 350,
    minBestDistance: 650,
    skyHex: 0x93d5f0,
    fogHex: 0x8fd0eb,
    sunHex: 0xfff3d1,
    sunIntensity: 2.15,
    groundHex: 0x4d7c0f,
    buildingPalette: [0x0284c7, 0xf59e0b, 0xecfdf5, 0xe11d48, 0x14b8a6, 0xfef3c7],
    hasOcean: true,
    hasMayanRuins: false,
  },
  {
    id: 'comayagua',
    name: 'Comayagua',
    region: 'Comayagua · Ciudad Colonial',
    description:
      'Calles empedradas, fachadas blancas coloniales con tejas de barro, parques arbolados y tradición.',
    unlockCost: 500,
    minBestDistance: 950,
    skyHex: 0xe9d8c4,
    fogHex: 0xe0cbb3,
    sunHex: 0xffe2b5,
    sunIntensity: 2.05,
    groundHex: 0x4b5530,
    buildingPalette: [0xf5f5f4, 0xe7e5e4, 0xfef3c7, 0xd6d3d1, 0xb45309, 0xfde68a],
    hasOcean: false,
    hasMayanRuins: false,
  },
  {
    id: 'copan',
    name: 'Copán Ruinas',
    region: 'Copán · Patrimonio Maya',
    description:
      'Calzadas rodeadas de estelas mayas talladas, bosque tropical húmedo y guacamayas rojas en vuelo.',
    unlockCost: 700,
    minBestDistance: 1300,
    skyHex: 0xaed9c9,
    fogHex: 0xa4d1c0,
    sunHex: 0xffe9c2,
    sunIntensity: 1.95,
    groundHex: 0x1a4326,
    buildingPalette: [0x78716c, 0x57534e, 0xa8a29e, 0xd6d3d1, 0x713f12, 0x854d0e],
    hasOcean: false,
    hasMayanRuins: true,
  },
  {
    id: 'roatan',
    name: 'Roatán',
    region: 'Islas de la Bahía · Caribe Turquesa',
    description:
      'Muelles costeros de madera, aguas turquesas, casas isleñas sobre pilotes y vegetación tropical.',
    unlockCost: 950,
    minBestDistance: 1700,
    skyHex: 0x7ed4f5,
    fogHex: 0x85d7f5,
    sunHex: 0xfff5db,
    sunIntensity: 2.3,
    groundHex: 0x65a30d,
    buildingPalette: [0x0ea5e9, 0xf97316, 0xf8fafc, 0x10b981, 0xeab308, 0xf43f5e],
    hasOcean: true,
    hasMayanRuins: false,
  },
];

export const CHARACTER_CATALOG: CharacterCatalogItem[] = [
  {
    id: 'protagonist',
    name: 'Protagonista Urbano',
    role: 'Corredor sin nombre fijo',
    category: 'Protagonista',
    description:
      'Ciudadano común de Tegucigalpa con chaqueta ligera y estilo realista. Admite fotografía de referencia.',
    priceCoins: 0,
    minBestDistance: 0,
    appearance: {
      skinHex: 0xc68b63,
      hairHex: 0x1a1715,
      torsoHex: 0x1d4ed8,
      accentHex: 0xf8fafc,
      pantsHex: 0x1e293b,
      shoeHex: 0xe2e8f0,
      defaultHat: 'ninguna',
      defaultBackpack: 'mochila_urbana',
      isJacket: true,
    },
  },
  {
    id: 'vendedora_baleadas',
    name: 'Doña Marisol — Vendedora de Baleadas',
    role: 'Maestra del Comal · Activo 3D Detallado',
    category: 'Comerciante',
    description:
      'Modelo 3D fotorrealista con blusa bordada catracha, falda plisada, delantal de manta con paño y espátula, aretes y pulseras doradas, collar de cuentas, moño trenzado y canasta artesanal llena de baleadas.',
    priceCoins: 0,
    minBestDistance: 0,
    appearance: {
      skinHex: 0xb97b55,
      hairHex: 0x161210,
      torsoHex: 0xf8fafc,
      accentHex: 0x0284c7,
      pantsHex: 0x172e4d,
      shoeHex: 0x452412,
      defaultHat: 'ninguna',
      defaultBackpack: 'ninguna',
      isFemale: true,
      hasApron: true,
      hasVendorBasket: true,
    },
  },
  {
    id: 'morazan',
    name: 'Francisco Morazán',
    role: 'General y Estadista Centroamericano',
    category: 'Histórico',
    description:
      'Personaje histórico con casaca azul de gala del siglo XIX, charreteras doradas, banda ceremonial y bicornio.',
    priceCoins: 350,
    minBestDistance: 400,
    appearance: {
      skinHex: 0xdba986,
      hairHex: 0x261d17,
      torsoHex: 0x172554,
      accentHex: 0xeab308,
      pantsHex: 0xf1f5f9,
      shoeHex: 0x111827,
      defaultHat: 'bicornio',
      defaultBackpack: 'ninguna',
      isHistoric: true,
    },
  },
  {
    id: 'estudiante_unah',
    name: 'Universitario de Tegus',
    role: 'Estudiante de Ingeniería',
    category: 'Estudiante',
    description: 'Sudadera azul marino, pantalón de mezclilla y mochila cargada de cuadernos.',
    priceCoins: 60,
    minBestDistance: 0,
    appearance: {
      skinHex: 0xb97d56,
      hairHex: 0x171412,
      torsoHex: 0x0f294a,
      accentHex: 0xfacc15,
      pantsHex: 0x334155,
      shoeHex: 0xf8fafc,
      defaultHat: 'gorra_catracha',
      defaultBackpack: 'mochila_urbana',
      isJacket: true,
    },
  },
  {
    id: 'estudiante_tecnico',
    name: 'Estudiante de Instituto',
    role: 'Bachiller Técnico',
    category: 'Estudiante',
    description: 'Camisa blanca impecable con corbata azul y pantalón formal escolar.',
    priceCoins: 80,
    minBestDistance: 0,
    appearance: {
      skinHex: 0xc98d66,
      hairHex: 0x1e1815,
      torsoHex: 0xf1f5f9,
      accentHex: 0x1e3a8a,
      pantsHex: 0x1e293b,
      shoeHex: 0x0f172a,
      defaultHat: 'ninguna',
      defaultBackpack: 'mochila_urbana',
      hasTie: true,
    },
  },
  {
    id: 'futbolista_seleccion',
    name: 'Delantero Nacional',
    role: 'Futbolista Ficticio',
    category: 'Futbolista',
    description: 'Uniforme deportivo azul y blanco de entrenamiento con tacos profesionales.',
    priceCoins: 110,
    minBestDistance: 100,
    appearance: {
      skinHex: 0x8d5534,
      hairHex: 0x141210,
      torsoHex: 0x0284c7,
      accentHex: 0xffffff,
      pantsHex: 0x0369a1,
      shoeHex: 0xfacc15,
      defaultHat: 'ninguna',
      defaultBackpack: 'ninguna',
    },
  },
  {
    id: 'futbolista_portero',
    name: 'Guardameta Catracho',
    role: 'Portero Ficticio',
    category: 'Futbolista',
    description: 'Camiseta técnica verde esmeralda y guantes de alto agarre.',
    priceCoins: 130,
    minBestDistance: 150,
    appearance: {
      skinHex: 0xb67a54,
      hairHex: 0x261d17,
      torsoHex: 0x059669,
      accentHex: 0x111827,
      pantsHex: 0x0f172a,
      shoeHex: 0x22c55e,
      defaultHat: 'gorra_catracha',
      defaultBackpack: 'ninguna',
    },
  },
  {
    id: 'policia_municipal',
    name: 'Agente Municipal',
    role: 'Policía de Tegucigalpa',
    category: 'Policía',
    description: 'Uniforme oficial azul oscuro con placa metálica, cinturón táctico y gorra.',
    priceCoins: 160,
    minBestDistance: 200,
    appearance: {
      skinHex: 0xaa6f4a,
      hairHex: 0x181512,
      torsoHex: 0x1e3a8a,
      accentHex: 0xfacc15,
      pantsHex: 0x0f172a,
      shoeHex: 0x090d16,
      defaultHat: 'gorra_catracha',
      defaultBackpack: 'ninguna',
      hasVest: true,
    },
  },
  {
    id: 'policia_transito',
    name: 'Oficial de Vialidad',
    role: 'Policía de Tránsito',
    category: 'Policía',
    description: 'Chaleco reflectivo de alta visibilidad sobre uniforme táctico y botas.',
    priceCoins: 185,
    minBestDistance: 250,
    appearance: {
      skinHex: 0xc2855e,
      hairHex: 0x1f1a17,
      torsoHex: 0x1e293b,
      accentHex: 0xa3e635,
      pantsHex: 0x111827,
      shoeHex: 0x18181b,
      defaultHat: 'gorra_catracha',
      defaultBackpack: 'ninguna',
      hasVest: true,
    },
  },
  {
    id: 'conductor_rapidito',
    name: 'Chofer de Rapidito',
    role: 'Conductor Urbano',
    category: 'Conductor',
    description: 'Camisa polo gris acero, chaleco utilitario y gafas de sol para jornadas largas.',
    priceCoins: 120,
    minBestDistance: 100,
    appearance: {
      skinHex: 0xa66b47,
      hairHex: 0x1a1715,
      torsoHex: 0x475569,
      accentHex: 0xf59e0b,
      pantsHex: 0x1e293b,
      shoeHex: 0x334155,
      defaultHat: 'gorra_catracha',
      defaultBackpack: 'ninguna',
      hasVest: true,
    },
  },
  {
    id: 'conductor_escolar',
    name: 'Conductor Escolar',
    role: 'Transporte Estudiantil',
    category: 'Conductor',
    description: 'Chaqueta caqui ligera, camisa azul celeste y reloj de pulso.',
    priceCoins: 140,
    minBestDistance: 150,
    appearance: {
      skinHex: 0xbd815a,
      hairHex: 0x362d26,
      torsoHex: 0x92400e,
      accentHex: 0xfde047,
      pantsHex: 0x3f3f46,
      shoeHex: 0x27272a,
      defaultHat: 'ninguna',
      defaultBackpack: 'ninguna',
      isJacket: true,
    },
  },
  {
    id: 'comerciante_mercado',
    name: 'Comerciante del Centro',
    role: 'Mercado Los Dolores',
    category: 'Comerciante',
    description: 'Camisa arremangada, delantal de lona resistente y sombrero tradicional de junco.',
    priceCoins: 95,
    minBestDistance: 50,
    appearance: {
      skinHex: 0xb0744e,
      hairHex: 0x1e1916,
      torsoHex: 0xf8fafc,
      accentHex: 0x9a3412,
      pantsHex: 0x292524,
      shoeHex: 0x451a03,
      defaultHat: 'sombrero_junco',
      defaultBackpack: 'ninguna',
      hasApron: true,
    },
  },
  {
    id: 'comerciante_cafe',
    name: 'Barista de Marcala',
    role: 'Tostador de Café',
    category: 'Comerciante',
    description: 'Delantal de cuero oscuro, camisa beige natural y estética artesanal.',
    priceCoins: 145,
    minBestDistance: 200,
    appearance: {
      skinHex: 0xce946d,
      hairHex: 0x291f19,
      torsoHex: 0xe7e5e4,
      accentHex: 0x451a03,
      pantsHex: 0x1c1917,
      shoeHex: 0x292524,
      defaultHat: 'ninguna',
      defaultBackpack: 'ninguna',
      hasApron: true,
    },
  },
  {
    id: 'motociclista_urbano',
    name: 'Repartidor Express',
    role: 'Motociclista de Ciudad',
    category: 'Motociclista',
    description: 'Chaqueta protectora gris, casco integral y mochila térmica de reparto.',
    priceCoins: 170,
    minBestDistance: 220,
    appearance: {
      skinHex: 0xb47852,
      hairHex: 0x111111,
      torsoHex: 0x334155,
      accentHex: 0xea580c,
      pantsHex: 0x0f172a,
      shoeHex: 0x1e293b,
      defaultHat: 'casco_moto',
      defaultBackpack: 'mochila_reparto',
      isJacket: true,
    },
  },
  {
    id: 'motociclista_ruta',
    name: 'Piloto de Carretera',
    role: 'Motociclista CA-5',
    category: 'Motociclista',
    description: 'Chaqueta negra de cuero con franja carmesí, guantes y casco aerodinámico.',
    priceCoins: 210,
    minBestDistance: 300,
    appearance: {
      skinHex: 0xc58962,
      hairHex: 0x181512,
      torsoHex: 0x18181b,
      accentHex: 0xdc2626,
      pantsHex: 0x09090b,
      shoeHex: 0x27272a,
      defaultHat: 'casco_moto',
      defaultBackpack: 'ninguna',
      isJacket: true,
    },
  },
  {
    id: 'trabajador_obra',
    name: 'Ingeniero de Obra',
    role: 'Constructor Civil',
    category: 'Trabajador',
    description: 'Casco amarillo industrial, chaleco naranja reflectivo y botas reforzadas.',
    priceCoins: 150,
    minBestDistance: 180,
    appearance: {
      skinHex: 0xa46844,
      hairHex: 0x1b1714,
      torsoHex: 0x475569,
      accentHex: 0xf97316,
      pantsHex: 0x334155,
      shoeHex: 0x78350f,
      defaultHat: 'casco_obra',
      defaultBackpack: 'ninguna',
      hasVest: true,
    },
  },
  {
    id: 'trabajador_cafe',
    name: 'Caficultor de Altura',
    role: 'Trabajador Agrícola',
    category: 'Trabajador',
    description: 'Camisa de campo verde oliva, pantalón de lona y sombrero de ala ancha.',
    priceCoins: 165,
    minBestDistance: 240,
    appearance: {
      skinHex: 0xb1754f,
      hairHex: 0x241d18,
      torsoHex: 0x3f6212,
      accentHex: 0xa16207,
      pantsHex: 0x44403c,
      shoeHex: 0x451a03,
      defaultHat: 'sombrero_junco',
      defaultBackpack: 'mochila_expedicion',
    },
  },
  {
    id: 'deportista_atleta',
    name: 'Maratonista de El Picacho',
    role: 'Atleta de Fondo',
    category: 'Deportista',
    description: 'Indumentaria atlética ligera en rojo carmesí y tenis de competición.',
    priceCoins: 195,
    minBestDistance: 280,
    appearance: {
      skinHex: 0x9b603d,
      hairHex: 0x141210,
      torsoHex: 0xbe123c,
      accentHex: 0xf8fafc,
      pantsHex: 0x18181b,
      shoeHex: 0x38bdf8,
      defaultHat: 'ninguna',
      defaultBackpack: 'ninguna',
    },
  },
  {
    id: 'deportista_ciclista',
    name: 'Ciclista de Valle de Ángeles',
    role: 'Deportista de Ruta',
    category: 'Deportista',
    description: 'Maillot deportivo turquesa y grafito con casco aerodinámico.',
    priceCoins: 230,
    minBestDistance: 350,
    appearance: {
      skinHex: 0xcc916a,
      hairHex: 0x261d17,
      torsoHex: 0x0d9488,
      accentHex: 0x0f172a,
      pantsHex: 0x111827,
      shoeHex: 0xfacc15,
      defaultHat: 'casco_moto',
      defaultBackpack: 'ninguna',
    },
  },
  {
    id: 'explorador_copan',
    name: 'Arqueólogo de Copán',
    role: 'Explorador Cultural',
    category: 'Explorador',
    description: 'Chaqueta safari color arena, sombrero explorador y mochila de campo.',
    priceCoins: 260,
    minBestDistance: 450,
    appearance: {
      skinHex: 0xc2865f,
      hairHex: 0x332820,
      torsoHex: 0xa88b5a,
      accentHex: 0x4d7c0f,
      pantsHex: 0x57534e,
      shoeHex: 0x451a03,
      defaultHat: 'sombrero_junco',
      defaultBackpack: 'mochila_expedicion',
      isJacket: true,
    },
  },
  {
    id: 'explorador_mosquitia',
    name: 'Guardaparques de Río Plátano',
    role: 'Explorador de Selva',
    category: 'Explorador',
    description: 'Uniforme forestal verde bosque, botas todo terreno y equipo de expedición.',
    priceCoins: 290,
    minBestDistance: 550,
    appearance: {
      skinHex: 0xa86c48,
      hairHex: 0x171412,
      torsoHex: 0x166534,
      accentHex: 0xca8a04,
      pantsHex: 0x292524,
      shoeHex: 0x1c1917,
      defaultHat: 'gorra_catracha',
      defaultBackpack: 'mochila_expedicion',
      hasVest: true,
    },
  },
  {
    id: 'explorador_roatan',
    name: 'Navegante de Roatán',
    role: 'Explorador Costero',
    category: 'Explorador',
    description: 'Chaqueta cortavientos azul océano con detalles turquesa y mochila impermeable.',
    priceCoins: 320,
    minBestDistance: 650,
    appearance: {
      skinHex: 0x995e3c,
      hairHex: 0x141210,
      torsoHex: 0x0369a1,
      accentHex: 0x2dd4bf,
      pantsHex: 0x1e293b,
      shoeHex: 0xf1f5f9,
      defaultHat: 'ninguna',
      defaultBackpack: 'mochila_urbana',
      isJacket: true,
    },
  },
];

export const OUTFIT_CATALOG: GearCatalogItem<OutfitId>[] = [
  {
    id: 'urbano_tegus',
    name: 'Chaqueta Urbana Azul',
    description: 'Chaqueta deportiva moderna de uso diario en Tegucigalpa.',
    priceCoins: 0,
    swatchHex: '#1d4ed8',
  },
  {
    id: 'azul_nacional',
    name: 'Indumentaria Bicolor',
    description: 'Tonos azul turquesa y blanco inspirados en la bandera nacional.',
    priceCoins: 75,
    swatchHex: '#0284c7',
  },
  {
    id: 'ejecutivo_sps',
    name: 'Estilo Metropolitano',
    description: 'Chaqueta grafito elegante con camisa interior clara.',
    priceCoins: 110,
    swatchHex: '#334155',
  },
  {
    id: 'safari_copan',
    name: 'Expedición Copán',
    description: 'Tonos caqui y verde selva resistentes para rutas largas.',
    priceCoins: 135,
    swatchHex: '#854d0e',
  },
  {
    id: 'moto_cuero',
    name: 'Cuero Nocturno',
    description: 'Chaqueta oscura con acentos carmesí para máxima presencia.',
    priceCoins: 170,
    swatchHex: '#991b1b',
  },
];

export const SHOE_CATALOG: GearCatalogItem<ShoeId>[] = [
  {
    id: 'tenis_urbanos',
    name: 'Tenis Urbanos Blancos',
    description: 'Calzado ligero con suela de goma de alto agarre.',
    priceCoins: 0,
    swatchHex: '#e2e8f0',
  },
  {
    id: 'botas_tacticas',
    name: 'Botas Tácticas Negras',
    description: 'Botas robustas con caña media y puntera reforzada.',
    priceCoins: 65,
    swatchHex: '#18181b',
  },
  {
    id: 'tacos_futbol',
    name: 'Calzado Deportivo Dorado',
    description: 'Diseño aerodinámico en tono oro y negro.',
    priceCoins: 90,
    swatchHex: '#eab308',
  },
  {
    id: 'botas_campo',
    name: 'Botas de Montaña',
    description: 'Cuero café resistente para caminos de piedra y tierra.',
    priceCoins: 85,
    swatchHex: '#78350f',
  },
];

export const HAT_CATALOG: GearCatalogItem<HatId>[] = [
  {
    id: 'ninguna',
    name: 'Sin Gorra',
    description: 'Cabello natural sin cubierta adicional.',
    priceCoins: 0,
    swatchHex: '#475569',
  },
  {
    id: 'gorra_catracha',
    name: 'Gorra Azul Turquesa',
    description: 'Gorra urbana con visera curva.',
    priceCoins: 45,
    swatchHex: '#0284c7',
  },
  {
    id: 'sombrero_junco',
    name: 'Sombrero de Junco',
    description: 'Tejido artesanal tradicional hondureño.',
    priceCoins: 80,
    swatchHex: '#d4b483',
  },
  {
    id: 'casco_moto',
    name: 'Casco Integral Urbano',
    description: 'Casco oscuro con visor polarizado.',
    priceCoins: 120,
    swatchHex: '#1e293b',
  },
  {
    id: 'casco_obra',
    name: 'Casco de Seguridad',
    description: 'Casco amarillo de ingeniería civil.',
    priceCoins: 70,
    swatchHex: '#facc15',
  },
];

export const BACKPACK_CATALOG: GearCatalogItem<BackpackId>[] = [
  {
    id: 'ninguna',
    name: 'Sin Mochila',
    description: 'Perfil ligero y aerodinámico.',
    priceCoins: 0,
    swatchHex: '#475569',
  },
  {
    id: 'mochila_urbana',
    name: 'Mochila Urbana',
    description: 'Mochila diaria color grafito con correas reforzadas.',
    priceCoins: 0,
    swatchHex: '#334155',
  },
  {
    id: 'mochila_reparto',
    name: 'Mochila Térmica',
    description: 'Mochila estructurada de mensajería rápida.',
    priceCoins: 85,
    swatchHex: '#c2410c',
  },
  {
    id: 'mochila_expedicion',
    name: 'Mochila de Expedición',
    description: 'Equipo verde oliva para aventuras por Copán y La Mosquitia.',
    priceCoins: 115,
    swatchHex: '#3f6212',
  },
];

export const ACCESSORY_CATALOG: GearCatalogItem<AccessoryId>[] = [
  {
    id: 'ninguno',
    name: 'Sin Accesorios',
    description: 'Rostro despejado.',
    priceCoins: 0,
    swatchHex: '#475569',
  },
  {
    id: 'lentes_aviador',
    name: 'Lentes Aviador',
    description: 'Gafas oscuras con marco metálico.',
    priceCoins: 55,
    swatchHex: '#ca8a04',
  },
  {
    id: 'lentes_deportivos',
    name: 'Lentes Deportivos',
    description: 'Visor polarizado envolvente.',
    priceCoins: 75,
    swatchHex: '#0ea5e9',
  },
  {
    id: 'reloj_tactico',
    name: 'Reloj Cronógrafo',
    description: 'Reloj metálico en la muñeca izquierda.',
    priceCoins: 60,
    swatchHex: '#94a3b8',
  },
];

export const BILLING_PACKAGES: StoreBillingPackage[] = [
  {
    sku: 'rc_coins_pack_500',
    title: 'Paquete 500 Monedas 5¢',
    description: 'Preparado para compra oficial mediante Google Play Billing en Android APK.',
    displayPriceNote: 'Google Play Billing (No simulado en Web)',
  },
  {
    sku: 'rc_coins_pack_2000',
    title: 'Paquete 2,000 Monedas 5¢',
    description: 'Reserva amplia para desbloquear personajes y ciudades.',
    displayPriceNote: 'Google Play Billing (No simulado en Web)',
  },
  {
    sku: 'rc_remove_ads',
    title: 'Eliminar Anuncios',
    description: 'Suprime anuncios intersticiales en versiones móviles.',
    displayPriceNote: 'Google Play Billing (No simulado en Web)',
  },
];

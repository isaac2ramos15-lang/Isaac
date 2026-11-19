import * as THREE from 'three';

export interface GameTextureSet {
  roadTexture: THREE.CanvasTexture;
  roadRoughnessTexture: THREE.CanvasTexture;
  sidewalkTexture: THREE.CanvasTexture;
  buildingFacadeTexture: THREE.CanvasTexture;
  cinderblockTexture: THREE.CanvasTexture;
  brickWallTexture: THREE.CanvasTexture;
  barrioStuccoTexture: THREE.CanvasTexture;
  zincRoofTexture: THREE.CanvasTexture;
  coinFaceTexture: THREE.CanvasTexture;
  busSigns: THREE.CanvasTexture[];
  schoolBusSign: THREE.CanvasTexture;
  decoratedBusMural: THREE.CanvasTexture;
  archBannerTexture: THREE.CanvasTexture;
  hondurasFlagTexture: THREE.CanvasTexture;
  shopSigns: THREE.CanvasTexture[];
  copanStoneTexture: THREE.CanvasTexture;
  altoSignTexture: THREE.CanvasTexture;
  cathedralStoneTexture: THREE.CanvasTexture;
  stadiumFacadeTexture: THREE.CanvasTexture;
  oceanWaterTexture: THREE.CanvasTexture;
  corporateGlassTexture: THREE.CanvasTexture;
  dispose: () => void;
}

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
  isLinear = false,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isLinear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export function createGameTextures(maxAnisotropy: number): GameTextureSet {
  const aniso = Math.min(8, Math.max(1, maxAnisotropy));

  // 1. High-Res 1024x1024 Photorealistic Honduran Asphalt (Aggregate, Cracks, Patches, Shoulder Dust)
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 1024;
  roadCanvas.height = 1024;
  const rctx = roadCanvas.getContext('2d')!;
  rctx.fillStyle = '#24272d';
  rctx.fillRect(0, 0, 1024, 1024);

  // Subtle tire-wear darkening in each of the 3 lanes
  [170, 512, 854].forEach((cx) => {
    const g = rctx.createLinearGradient(cx - 105, 0, cx + 105, 0);
    g.addColorStop(0, 'rgba(13,15,19,0)');
    g.addColorStop(0.28, 'rgba(13,15,19,0.42)');
    g.addColorStop(0.72, 'rgba(13,15,19,0.42)');
    g.addColorStop(1, 'rgba(13,15,19,0)');
    rctx.fillStyle = g;
    rctx.fillRect(cx - 105, 0, 210, 1024);
  });

  // Dusty gutter edges near sidewalks
  const leftDust = rctx.createLinearGradient(0, 0, 76, 0);
  leftDust.addColorStop(0, 'rgba(128, 114, 92, 0.45)');
  leftDust.addColorStop(1, 'rgba(128, 114, 92, 0)');
  rctx.fillStyle = leftDust;
  rctx.fillRect(0, 0, 76, 1024);

  const rightDust = rctx.createLinearGradient(948, 0, 1024, 0);
  rightDust.addColorStop(0, 'rgba(128, 114, 92, 0)');
  rightDust.addColorStop(1, 'rgba(128, 114, 92, 0.45)');
  rctx.fillStyle = rightDust;
  rctx.fillRect(948, 0, 76, 1024);

  // Mineral aggregate speckle
  for (let i = 0; i < 24000; i++) {
    const x = (i * 197 + ((i % 7) * 13)) % 1024;
    const y = (i * 313 + ((i % 11) * 19)) % 1024;
    const shade = 26 + ((i * 29) % 34);
    rctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 5})`;
    rctx.fillRect(x, y, 2, 2);
  }

  // Asphalt tar repair patches (bacheos típicos)
  [
    [130, 190, 95, 165],
    [790, 610, 115, 190],
    [455, 790, 90, 120],
  ].forEach(([px, py, pw, ph]) => {
    rctx.fillStyle = 'rgba(18, 20, 25, 0.56)';
    rctx.fillRect(px, py, pw, ph);
    rctx.strokeStyle = 'rgba(10, 12, 16, 0.8)';
    rctx.lineWidth = 3;
    rctx.strokeRect(px, py, pw, ph);
  });

  // Realistic hairline cracks & tar sealant veins
  rctx.strokeStyle = 'rgba(11, 13, 16, 0.85)';
  rctx.lineWidth = 2.5;
  for (let c = 0; c < 14; c++) {
    let cx = 80 + ((c * 193) % 860);
    let cy = (c * 149) % 1024;
    rctx.beginPath();
    rctx.moveTo(cx, cy);
    for (let s = 0; s < 6; s++) {
      cx += ((c + s) % 2 === 0 ? 1 : -1) * (10 + ((s * 7) % 18));
      cy += 22 + ((c * 11) % 20);
      rctx.lineTo(cx, cy);
    }
    rctx.stroke();
  }

  // Weathered yellow edge shoulders + chipped white dashed lane dividers
  rctx.fillStyle = 'rgba(212, 158, 28, 0.84)';
  rctx.fillRect(20, 0, 14, 1024);
  rctx.fillRect(990, 0, 14, 1024);

  rctx.fillStyle = 'rgba(226, 232, 240, 0.78)';
  const lane1X = Math.round(1024 / 3) - 7;
  const lane2X = Math.round((1024 * 2) / 3) - 7;
  for (let y = 36; y < 1024; y += 256) {
    rctx.fillRect(lane1X, y, 14, 124);
    rctx.fillRect(lane2X, y, 14, 124);
    // Subtle tire scuffs across lane paint
    rctx.fillStyle = 'rgba(34, 37, 44, 0.42)';
    rctx.fillRect(lane1X, y + 36, 14, 12);
    rctx.fillRect(lane2X, y + 74, 14, 14);
    rctx.fillStyle = 'rgba(226, 232, 240, 0.78)';
  }
  const roadTexture = finalizeColorTexture(roadCanvas, aniso, 1, 2);

  // Matching road roughness map (polished tire grooves, matte shoulders & dust)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 512;
  roughCanvas.height = 512;
  const rgCtx = roughCanvas.getContext('2d')!;
  rgCtx.fillStyle = '#d4d4d4';
  rgCtx.fillRect(0, 0, 512, 512);
  [85, 256, 427].forEach((cx) => {
    rgCtx.fillStyle = '#8b8b8b';
    rgCtx.fillRect(cx - 46, 0, 92, 512);
  });
  for (let i = 0; i < 4500; i++) {
    const x = (i * 89) % 512;
    const y = (i * 151) % 512;
    const g = 145 + (i % 70);
    rgCtx.fillStyle = `rgb(${g},${g},${g})`;
    rgCtx.fillRect(x, y, 2, 2);
  }
  const roadRoughnessTexture = finalizeColorTexture(roughCanvas, aniso, 1, 2, true);

  // 2. Concrete Sidewalk Paving Grid (512x512 weathered concrete)
  const swCanvas = document.createElement('canvas');
  swCanvas.width = 512;
  swCanvas.height = 512;
  const swCtx = swCanvas.getContext('2d')!;
  swCtx.fillStyle = '#928c83';
  swCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 7000; i++) {
    const x = (i * 97) % 512;
    const y = (i * 173) % 512;
    const v = 122 + (i % 38);
    swCtx.fillStyle = `rgb(${v},${v - 4},${v - 9})`;
    swCtx.fillRect(x, y, 2, 2);
  }
  swCtx.strokeStyle = '#5c5851';
  swCtx.lineWidth = 5;
  for (let i = 0; i <= 512; i += 128) {
    swCtx.beginPath();
    swCtx.moveTo(i, 0);
    swCtx.lineTo(i, 512);
    swCtx.stroke();
    swCtx.beginPath();
    swCtx.moveTo(0, i);
    swCtx.lineTo(512, i);
    swCtx.stroke();
  }
  // Hairline sidewalk slab cracks
  swCtx.strokeStyle = 'rgba(65, 60, 54, 0.65)';
  swCtx.lineWidth = 2;
  swCtx.beginPath();
  swCtx.moveTo(128, 180);
  swCtx.lineTo(190, 215);
  swCtx.lineTo(256, 204);
  swCtx.stroke();
  const sidewalkTexture = finalizeColorTexture(swCanvas, aniso, 2, 4);

  // 3. Realistic Multi-Story Building Window & Concrete Facade Texture
  const facCanvas = document.createElement('canvas');
  facCanvas.width = 256;
  facCanvas.height = 256;
  const fCtx = facCanvas.getContext('2d')!;
  fCtx.fillStyle = '#d4d4d8';
  fCtx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const wx = 14 + col * 60;
      const wy = 16 + row * 60;
      fCtx.fillStyle = '#3f3f46';
      fCtx.fillRect(wx - 2, wy - 2, 42, 42);
      const glassGrad = fCtx.createLinearGradient(wx, wy, wx + 38, wy + 38);
      glassGrad.addColorStop(0, (row + col) % 3 === 0 ? '#334155' : '#1e293b');
      glassGrad.addColorStop(1, '#0f172a');
      fCtx.fillStyle = glassGrad;
      fCtx.fillRect(wx, wy, 38, 38);
      fCtx.fillStyle = 'rgba(186, 230, 253, 0.14)';
      fCtx.fillRect(wx + 3, wy + 3, 14, 32);
    }
  }
  const buildingFacadeTexture = finalizeColorTexture(facCanvas, aniso, 1, 2);

  // 3b. Authentic Honduran Unpainted Cinderblock ("Bloque de Cemento") Wall Texture
  const cbCanvas = document.createElement('canvas');
  cbCanvas.width = 512;
  cbCanvas.height = 512;
  const cbCtx = cbCanvas.getContext('2d')!;
  cbCtx.fillStyle = '#6f7276'; // Mortar bed
  cbCtx.fillRect(0, 0, 512, 512);
  const blockW = 128;
  const blockH = 64;
  for (let row = 0; row < 8; row++) {
    const offset = (row % 2) * (blockW / 2);
    for (let col = -1; col < 5; col++) {
      const bx = col * blockW + offset;
      const by = row * blockH;
      const tone = 124 + ((row * 19 + (col + 2) * 31) % 24);
      cbCtx.fillStyle = `rgb(${tone},${tone + 2},${tone + 4})`;
      cbCtx.fillRect(bx + 4, by + 4, blockW - 8, blockH - 8);
      cbCtx.fillStyle = `rgba(255,255,255,0.08)`;
      cbCtx.fillRect(bx + 4, by + 4, blockW - 8, 5);
    }
  }
  for (let i = 0; i < 9000; i++) {
    const x = (i * 113) % 512;
    const y = (i * 193) % 512;
    cbCtx.fillStyle = i % 2 === 0 ? 'rgba(30,32,36,0.16)' : 'rgba(220,224,228,0.12)';
    cbCtx.fillRect(x, y, 2, 2);
  }
  const cinderblockTexture = finalizeColorTexture(cbCanvas, aniso, 2, 2);

  // 3c. Authentic Honduran Clay Brick ("Ladrillo Rafón") Wall Texture
  const brCanvas = document.createElement('canvas');
  brCanvas.width = 512;
  brCanvas.height = 512;
  const brCtx = brCanvas.getContext('2d')!;
  brCtx.fillStyle = '#9ca39d'; // Sandy cement mortar
  brCtx.fillRect(0, 0, 512, 512);
  const brickW = 64;
  const brickH = 32;
  for (let row = 0; row < 16; row++) {
    const offset = (row % 2) * (brickW / 2);
    for (let col = -1; col < 9; col++) {
      const bx = col * brickW + offset;
      const by = row * brickH;
      const r = 148 + ((row * 17 + (col + 3) * 23) % 34);
      const g = 74 + ((row * 13 + (col + 3) * 19) % 20);
      const b = 52 + ((row * 7 + (col + 3) * 11) % 16);
      brCtx.fillStyle = `rgb(${r},${g},${b})`;
      brCtx.fillRect(bx + 3, by + 3, brickW - 6, brickH - 6);
    }
  }
  for (let i = 0; i < 6000; i++) {
    const x = (i * 131) % 512;
    const y = (i * 211) % 512;
    brCtx.fillStyle = 'rgba(25, 16, 12, 0.14)';
    brCtx.fillRect(x, y, 2, 2);
  }
  const brickWallTexture = finalizeColorTexture(brCanvas, aniso, 2, 2);

  // 3d. Weathered Barrio Stucco / Painted Repello Texture (multiplies cleanly with wall color)
  const stCanvas = document.createElement('canvas');
  stCanvas.width = 512;
  stCanvas.height = 512;
  const stuccoCtx = stCanvas.getContext('2d')!;
  const stGrad = stuccoCtx.createLinearGradient(0, 0, 0, 512);
  stGrad.addColorStop(0, '#ededed');
  stGrad.addColorStop(0.76, '#e2e2e0');
  stGrad.addColorStop(1, '#b6b0a6'); // Damp/dusty lower wall splash zone
  stuccoCtx.fillStyle = stGrad;
  stuccoCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 11000; i++) {
    const x = (i * 107) % 512;
    const y = (i * 167) % 512;
    stuccoCtx.fillStyle = i % 3 === 0 ? 'rgba(90,82,74,0.14)' : 'rgba(255,255,255,0.12)';
    stuccoCtx.fillRect(x, y, 3, 2);
  }
  // Subtle rain streaks & hairline plaster cracks
  for (let s = 0; s < 14; s++) {
    const sx = (s * 43 + 19) % 500;
    const streak = stuccoCtx.createLinearGradient(sx, 0, sx, 160);
    streak.addColorStop(0, 'rgba(65, 62, 56, 0.24)');
    streak.addColorStop(1, 'rgba(65, 62, 56, 0)');
    stuccoCtx.fillStyle = streak;
    stuccoCtx.fillRect(sx, 0, 6, 160);
  }
  const barrioStuccoTexture = finalizeColorTexture(stCanvas, aniso, 1, 1);

  // 3e. Corrugated Galvanized / Weathered Zinc Roof ("Lámina de Zinc") Texture
  const znCanvas = document.createElement('canvas');
  znCanvas.width = 512;
  znCanvas.height = 512;
  const znCtx = znCanvas.getContext('2d')!;
  for (let x = 0; x < 512; x += 16) {
    const ridge = znCtx.createLinearGradient(x, 0, x + 16, 0);
    ridge.addColorStop(0, '#5a636e');
    ridge.addColorStop(0.35, '#9ea7b2');
    ridge.addColorStop(0.7, '#757f8b');
    ridge.addColorStop(1, '#525a65');
    znCtx.fillStyle = ridge;
    znCtx.fillRect(x, 0, 16, 512);
  }
  // Horizontal sheet overlap seams + weathered rust patina
  [170, 340].forEach((sy) => {
    znCtx.fillStyle = 'rgba(40, 44, 52, 0.65)';
    znCtx.fillRect(0, sy, 512, 4);
    znCtx.fillStyle = 'rgba(134, 65, 32, 0.35)';
    znCtx.fillRect(0, sy - 10, 512, 12);
  });
  for (let r = 0; r < 18; r++) {
    const rx = (r * 79) % 480;
    const ry = (r * 139) % 480;
    znCtx.fillStyle = 'rgba(124, 58, 28, 0.28)';
    znCtx.fillRect(rx, ry, 28, 34);
  }
  const zincRoofTexture = finalizeColorTexture(znCanvas, aniso, 2, 2);

  // 4. Golden Honduran 5 Centavos Collectible Coin
  const coinCanvas = document.createElement('canvas');
  coinCanvas.width = 256;
  coinCanvas.height = 256;
  const cctx = coinCanvas.getContext('2d')!;
  const grad = cctx.createRadialGradient(128, 128, 18, 128, 128, 128);
  grad.addColorStop(0, '#fef08a');
  grad.addColorStop(0.55, '#d97706');
  grad.addColorStop(1, '#78350f');
  cctx.fillStyle = grad;
  cctx.fillRect(0, 0, 256, 256);

  cctx.strokeStyle = '#451a03';
  cctx.lineWidth = 10;
  cctx.beginPath();
  cctx.arc(128, 128, 112, 0, Math.PI * 2);
  cctx.stroke();

  cctx.strokeStyle = '#fde68a';
  cctx.lineWidth = 3;
  cctx.beginPath();
  cctx.arc(128, 128, 98, 0, Math.PI * 2);
  cctx.stroke();

  cctx.fillStyle = '#451a03';
  cctx.font = '700 22px "Barlow Condensed", sans-serif';
  cctx.textAlign = 'center';
  cctx.fillText('REPÚBLICA DE HONDURAS', 128, 66);

  cctx.font = '800 84px "Barlow Condensed", sans-serif';
  cctx.fillText('5¢', 128, 156);

  cctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
  cctx.fillText('CINCO CENTAVOS', 128, 198);
  const coinFaceTexture = finalizeColorTexture(coinCanvas, aniso);

  // 5. Public Transit Bus Signs
  const routes = [
    { label: 'KENNEDY · CENTRO · UNAH', bg: '#090d16', fg: '#fbbf24' },
    { label: 'TOROCAGUA · TONCONTÍN', bg: '#090d16', fg: '#38bdf8' },
    { label: 'CARRIZAL · EL PICACHO', bg: '#090d16', fg: '#4ade80' },
  ];
  const busSigns = routes.map((route) => {
    const sc = document.createElement('canvas');
    sc.width = 256;
    sc.height = 64;
    const sctx = sc.getContext('2d')!;
    sctx.fillStyle = route.bg;
    sctx.fillRect(0, 0, 256, 64);
    sctx.strokeStyle = '#334155';
    sctx.lineWidth = 4;
    sctx.strokeRect(2, 2, 252, 60);
    sctx.fillStyle = route.fg;
    sctx.font = '700 22px "JetBrains Mono", monospace';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.fillText(route.label, 128, 34);
    return finalizeColorTexture(sc, aniso);
  });

  // 6. School Bus Marquee
  const sbCanvas = document.createElement('canvas');
  sbCanvas.width = 256;
  sbCanvas.height = 64;
  const sbctx = sbCanvas.getContext('2d')!;
  sbctx.fillStyle = '#0f172a';
  sbctx.fillRect(0, 0, 256, 64);
  sbctx.fillStyle = '#facc15';
  sbctx.font = '800 32px "Barlow Condensed", sans-serif';
  sbctx.textAlign = 'center';
  sbctx.textBaseline = 'middle';
  sbctx.fillText('TRANSPORTE ESCOLAR', 128, 33);
  const schoolBusSign = finalizeColorTexture(sbCanvas, aniso);

  // 7. Decorated Honduran Intercity Bus Mural
  const decCanvas = document.createElement('canvas');
  decCanvas.width = 512;
  decCanvas.height = 128;
  const dctx = decCanvas.getContext('2d')!;
  const decGrad = dctx.createLinearGradient(0, 0, 512, 0);
  decGrad.addColorStop(0, '#7c2d12');
  decGrad.addColorStop(0.5, '#0369a1');
  decGrad.addColorStop(1, '#b45309');
  dctx.fillStyle = decGrad;
  dctx.fillRect(0, 0, 512, 128);
  dctx.fillStyle = '#facc15';
  dctx.fillRect(0, 14, 512, 10);
  dctx.fillRect(0, 104, 512, 10);
  dctx.fillStyle = '#ffffff';
  dctx.font = '800 42px "Barlow Condensed", sans-serif';
  dctx.textAlign = 'center';
  dctx.textBaseline = 'middle';
  dctx.fillText('EXPRESO CATRACHO · HONDURAS', 256, 66);
  const decoratedBusMural = finalizeColorTexture(decCanvas, aniso);

  // 8. Overhead Arch Banner
  const archCanvas = document.createElement('canvas');
  archCanvas.width = 512;
  archCanvas.height = 128;
  const actx = archCanvas.getContext('2d')!;
  actx.fillStyle = '#1e293b';
  actx.fillRect(0, 0, 512, 128);
  actx.fillStyle = '#f59e0b';
  for (let x = -32; x < 544; x += 48) {
    actx.beginPath();
    actx.moveTo(x, 0);
    actx.lineTo(x + 24, 0);
    actx.lineTo(x + 8, 20);
    actx.lineTo(x - 16, 20);
    actx.closePath();
    actx.fill();
  }
  actx.fillStyle = '#f8fafc';
  actx.font = '800 38px "Barlow Condensed", sans-serif';
  actx.textAlign = 'center';
  actx.textBaseline = 'middle';
  actx.fillText('PRECAUCIÓN · ALTURA MÁXIMA 2.1M', 256, 68);
  const archBannerTexture = finalizeColorTexture(archCanvas, aniso);

  // 9. Honduras Flag Texture
  const flagCanvas = document.createElement('canvas');
  flagCanvas.width = 256;
  flagCanvas.height = 160;
  const flctx = flagCanvas.getContext('2d')!;
  flctx.fillStyle = '#00bce4';
  flctx.fillRect(0, 0, 256, 53);
  flctx.fillStyle = '#ffffff';
  flctx.fillRect(0, 53, 256, 54);
  flctx.fillStyle = '#00bce4';
  flctx.fillRect(0, 107, 256, 53);
  flctx.fillStyle = '#00bce4';
  [
    [98, 70],
    [98, 90],
    [128, 80],
    [158, 70],
    [158, 90],
  ].forEach(([sx, sy]) => {
    flctx.beginPath();
    flctx.arc(sx, sy, 5, 0, Math.PI * 2);
    flctx.fill();
  });
  const hondurasFlagTexture = finalizeColorTexture(flagCanvas, aniso);

  // 10. Authentic Honduran Barrio Pulperías, Comedores, Talleres & Tiendas
  const shops = [
    { name: 'PULPERÍA LA BENDICIÓN · RECARGAS', bg: '#7f1d1d', fg: '#fef3c7' },
    { name: 'BALEADAS DOÑA MARISOL · L.25', bg: '#0c4a6e', fg: '#f8fafc' },
    { name: 'TALLER EL CATRACHO · LLANTAS', bg: '#1e293b', fg: '#facc15' },
    { name: 'COMEDOR HONDUREÑO · SOPAS', bg: '#14532d', fg: '#fde68a' },
    { name: 'BARBERÍA & VARIEDADES', bg: '#312e81', fg: '#e0f2fe' },
    { name: 'FERRETERÍA & BLOQUES', bg: '#78350f', fg: '#ffffff' },
  ];
  const shopSigns = shops.map((s) => {
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 80;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = s.bg;
    ctx.fillRect(0, 0, 320, 80);
    ctx.strokeStyle = s.fg;
    ctx.lineWidth = 4;
    ctx.strokeRect(5, 5, 310, 70);
    ctx.fillStyle = s.fg;
    ctx.font = '800 21px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.name, 160, 41);
    return finalizeColorTexture(c, aniso);
  });

  // 11. Copán Mayan Carved Stone Texture
  const copanCanvas = document.createElement('canvas');
  copanCanvas.width = 256;
  copanCanvas.height = 256;
  const cpctx = copanCanvas.getContext('2d')!;
  cpctx.fillStyle = '#57534e';
  cpctx.fillRect(0, 0, 256, 256);
  cpctx.strokeStyle = '#292524';
  cpctx.lineWidth = 5;
  for (let y = 16; y < 240; y += 56) {
    for (let x = 16; x < 240; x += 56) {
      cpctx.strokeRect(x, y, 42, 42);
      cpctx.strokeRect(x + 10, y + 10, 22, 22);
    }
  }
  cpctx.fillStyle = 'rgba(54, 83, 20, 0.28)';
  cpctx.fillRect(0, 185, 256, 71);
  const copanStoneTexture = finalizeColorTexture(copanCanvas, aniso);

  // 12. ALTO Traffic Sign
  const altoCanvas = document.createElement('canvas');
  altoCanvas.width = 128;
  altoCanvas.height = 128;
  const alctx = altoCanvas.getContext('2d')!;
  alctx.fillStyle = '#b91c1c';
  alctx.fillRect(0, 0, 128, 128);
  alctx.strokeStyle = '#f8fafc';
  alctx.lineWidth = 8;
  alctx.strokeRect(8, 8, 112, 112);
  alctx.fillStyle = '#ffffff';
  alctx.font = '800 38px "Barlow Condensed", sans-serif';
  alctx.textAlign = 'center';
  alctx.textBaseline = 'middle';
  alctx.fillText('ALTO', 64, 66);
  const altoSignTexture = finalizeColorTexture(altoCanvas, aniso);

  // 13. Photorealistic Baroque Cathedral Limestone & Arched Colonade Texture
  const cathCanvas = document.createElement('canvas');
  cathCanvas.width = 256;
  cathCanvas.height = 256;
  const ctCtx = cathCanvas.getContext('2d')!;
  const ctGrad = ctCtx.createLinearGradient(0, 0, 0, 256);
  ctGrad.addColorStop(0, '#f3ebd8');
  ctGrad.addColorStop(0.65, '#e7dcc4');
  ctGrad.addColorStop(1, '#cfc0a3');
  ctCtx.fillStyle = ctGrad;
  ctCtx.fillRect(0, 0, 256, 256);
  ctCtx.strokeStyle = 'rgba(120, 95, 65, 0.25)';
  ctCtx.lineWidth = 2;
  for (let y = 0; y < 256; y += 32) {
    ctCtx.beginPath();
    ctCtx.moveTo(0, y);
    ctCtx.lineTo(256, y);
    ctCtx.stroke();
  }
  for (let col = 0; col < 3; col++) {
    const cx = 42 + col * 86;
    ctCtx.fillStyle = '#d6c3a5';
    ctCtx.fillRect(cx - 26, 24, 10, 212);
    ctCtx.fillRect(cx + 16, 24, 10, 212);
    ctCtx.fillStyle = '#3f2e21';
    ctCtx.beginPath();
    ctCtx.arc(cx, 118, 16, Math.PI, 0);
    ctCtx.lineTo(cx + 16, 224);
    ctCtx.lineTo(cx - 16, 224);
    ctCtx.closePath();
    ctCtx.fill();
  }
  const cathedralStoneTexture = finalizeColorTexture(cathCanvas, aniso, 1, 1);

  // 14. Photorealistic Stadium Concrete Tiers & Floodlit Concourse Texture
  const stadCanvas = document.createElement('canvas');
  stadCanvas.width = 256;
  stadCanvas.height = 256;
  const stCtx = stadCanvas.getContext('2d')!;
  stCtx.fillStyle = '#cbd5e1';
  stCtx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) {
    const ry = row * 32;
    stCtx.fillStyle = row % 2 === 0 ? '#64748b' : '#475569';
    stCtx.fillRect(0, ry + 14, 256, 14);
    stCtx.fillStyle = row < 2 ? '#0284c7' : '#1e293b';
    for (let seat = 6; seat < 256; seat += 18) {
      stCtx.fillRect(seat, ry + 17, 11, 8);
    }
  }
  const stadiumFacadeTexture = finalizeColorTexture(stadCanvas, aniso, 4, 1);

  // 15. Photorealistic Sunlit Caribbean Ocean Ripples & Seafoam Texture
  const seaCanvas = document.createElement('canvas');
  seaCanvas.width = 256;
  seaCanvas.height = 256;
  const oCtx = seaCanvas.getContext('2d')!;
  const oGrad = oCtx.createLinearGradient(0, 0, 256, 0);
  oGrad.addColorStop(0, '#bae6fd');
  oGrad.addColorStop(0.16, '#38bdf8');
  oGrad.addColorStop(0.5, '#0284c7');
  oGrad.addColorStop(1, '#0369a1');
  oCtx.fillStyle = oGrad;
  oCtx.fillRect(0, 0, 256, 256);
  for (let w = 0; w < 22; w++) {
    const wx = 12 + (w * 37) % 210;
    const wy = (w * 53) % 256;
    oCtx.fillStyle = wx < 44 ? 'rgba(248, 250, 252, 0.72)' : 'rgba(224, 242, 254, 0.28)';
    oCtx.fillRect(wx, wy, 5, 22);
  }
  const oceanWaterTexture = finalizeColorTexture(seaCanvas, aniso, 1, 3);

  // 16. Photorealistic Reflective Curtain-Wall Corporate Glass Tower Texture
  const glsCanvas = document.createElement('canvas');
  glsCanvas.width = 256;
  glsCanvas.height = 256;
  const gCtx = glsCanvas.getContext('2d')!;
  const skyRef = gCtx.createLinearGradient(0, 0, 256, 256);
  skyRef.addColorStop(0, '#38bdf8');
  skyRef.addColorStop(0.45, '#1e3a5f');
  skyRef.addColorStop(1, '#0f172a');
  gCtx.fillStyle = skyRef;
  gCtx.fillRect(0, 0, 256, 256);
  gCtx.strokeStyle = '#94a3b8';
  gCtx.lineWidth = 4;
  for (let i = 0; i <= 256; i += 32) {
    gCtx.beginPath();
    gCtx.moveTo(i, 0);
    gCtx.lineTo(i, 256);
    gCtx.stroke();
    gCtx.beginPath();
    gCtx.moveTo(0, i);
    gCtx.lineTo(256, i);
    gCtx.stroke();
  }
  const corporateGlassTexture = finalizeColorTexture(glsCanvas, aniso, 1, 2);

  return {
    roadTexture,
    roadRoughnessTexture,
    sidewalkTexture,
    buildingFacadeTexture,
    cinderblockTexture,
    brickWallTexture,
    barrioStuccoTexture,
    zincRoofTexture,
    coinFaceTexture,
    busSigns,
    schoolBusSign,
    decoratedBusMural,
    archBannerTexture,
    hondurasFlagTexture,
    shopSigns,
    copanStoneTexture,
    altoSignTexture,
    cathedralStoneTexture,
    stadiumFacadeTexture,
    oceanWaterTexture,
    corporateGlassTexture,
    dispose: () => {
      roadTexture.dispose();
      roadRoughnessTexture.dispose();
      sidewalkTexture.dispose();
      buildingFacadeTexture.dispose();
      cinderblockTexture.dispose();
      brickWallTexture.dispose();
      barrioStuccoTexture.dispose();
      zincRoofTexture.dispose();
      coinFaceTexture.dispose();
      busSigns.forEach((t) => t.dispose());
      schoolBusSign.dispose();
      decoratedBusMural.dispose();
      archBannerTexture.dispose();
      hondurasFlagTexture.dispose();
      shopSigns.forEach((t) => t.dispose());
      copanStoneTexture.dispose();
      altoSignTexture.dispose();
      cathedralStoneTexture.dispose();
      stadiumFacadeTexture.dispose();
      oceanWaterTexture.dispose();
      corporateGlassTexture.dispose();
    },
  };
}

import * as THREE from 'three';
import type { CharacterBuildOptions, PlayerRig } from './models';

interface TextureBundle {
  skinMap: THREE.CanvasTexture;
  blouseMap: THREE.CanvasTexture;
  apronMap: THREE.CanvasTexture;
  skirtMap: THREE.CanvasTexture;
  basketMap: THREE.CanvasTexture;
  tortillaMap: THREE.CanvasTexture;
  shadowMap: THREE.CanvasTexture;
}

function createNoiseCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  return tex;
}

function createVendedoraTextures(): TextureBundle {
  // 1. Photorealistic warm Honduran sunlit skin texture with subtle tonal variation
  const [skinC, skinCtx] = createNoiseCanvas(256, 256);
  const skinGrad = skinCtx.createLinearGradient(0, 0, 0, 256);
  skinGrad.addColorStop(0, '#c2835c');
  skinGrad.addColorStop(0.5, '#b8764f');
  skinGrad.addColorStop(1, '#a96843');
  skinCtx.fillStyle = skinGrad;
  skinCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    skinCtx.fillStyle = i % 2 === 0 ? 'rgba(255,214,185,0.035)' : 'rgba(92,48,26,0.035)';
    skinCtx.fillRect(x, y, 2, 2);
  }
  const skinMap = finalizeTexture(skinC);

  // 2. Embroidered cotton blouse (fine linen weave + turquoise/gold Honduran floral trim)
  const [blouseC, blouseCtx] = createNoiseCanvas(512, 512);
  blouseCtx.fillStyle = '#f6f4ef';
  blouseCtx.fillRect(0, 0, 512, 512);
  blouseCtx.strokeStyle = 'rgba(180, 175, 165, 0.24)';
  blouseCtx.lineWidth = 1;
  for (let y = 0; y < 512; y += 6) {
    blouseCtx.beginPath();
    blouseCtx.moveTo(0, y);
    blouseCtx.lineTo(512, y);
    blouseCtx.stroke();
  }
  for (let x = 0; x < 512; x += 6) {
    blouseCtx.beginPath();
    blouseCtx.moveTo(x, 0);
    blouseCtx.lineTo(x, 512);
    blouseCtx.stroke();
  }
  // Embroidered floral border band near top neckline
  blouseCtx.fillStyle = '#0369a1';
  blouseCtx.fillRect(0, 36, 512, 42);
  blouseCtx.fillStyle = '#38bdf8';
  blouseCtx.fillRect(0, 42, 512, 8);
  blouseCtx.fillRect(0, 66, 512, 8);
  for (let x = 16; x < 512; x += 36) {
    // Embroidered rosette motif
    blouseCtx.fillStyle = '#facc15';
    blouseCtx.beginPath();
    blouseCtx.arc(x, 57, 6, 0, Math.PI * 2);
    blouseCtx.fill();
    blouseCtx.fillStyle = '#e11d48';
    blouseCtx.beginPath();
    blouseCtx.arc(x - 10, 57, 4, 0, Math.PI * 2);
    blouseCtx.arc(x + 10, 57, 4, 0, Math.PI * 2);
    blouseCtx.fill();
  }
  const blouseMap = finalizeTexture(blouseC);

  // 3. Heavy cotton manta apron with blue/turquoise weave stripes, pocket & subtle flour dusting
  const [apronC, apronCtx] = createNoiseCanvas(512, 512);
  apronCtx.fillStyle = '#f1efe9';
  apronCtx.fillRect(0, 0, 512, 512);
  // Subtle canvas cross-weave
  for (let i = 0; i < 3200; i++) {
    const x = (i * 89) % 512;
    const y = (i * 53) % 512;
    apronCtx.fillStyle = i % 2 === 0 ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.22)';
    apronCtx.fillRect(x, y, 3, 2);
  }
  // Honduran cyan decorative trim bands
  apronCtx.fillStyle = '#0284c7';
  apronCtx.fillRect(0, 24, 512, 18);
  apronCtx.fillRect(0, 466, 512, 22);
  apronCtx.fillStyle = '#f59e0b';
  apronCtx.fillRect(0, 456, 512, 6);
  // Light realistic corn/wheat flour dusting on apron front
  for (let i = 0; i < 45; i++) {
    const fx = 110 + ((i * 67) % 290);
    const fy = 140 + ((i * 97) % 260);
    const r = 10 + (i % 14);
    const flGrad = apronCtx.createRadialGradient(fx, fy, 1, fx, fy, r);
    flGrad.addColorStop(0, 'rgba(255, 252, 244, 0.34)');
    flGrad.addColorStop(1, 'rgba(255, 252, 244, 0)');
    apronCtx.fillStyle = flGrad;
    apronCtx.beginPath();
    apronCtx.arc(fx, fy, r, 0, Math.PI * 2);
    apronCtx.fill();
  }
  const apronMap = finalizeTexture(apronC);

  // 4. Deep indigo herringbone pleated skirt fabric with embroidered hem
  const [skirtC, skirtCtx] = createNoiseCanvas(512, 512);
  skirtCtx.fillStyle = '#172e4d';
  skirtCtx.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 24) {
    skirtCtx.fillStyle = x % 48 === 0 ? 'rgba(9, 20, 38, 0.36)' : 'rgba(56, 189, 248, 0.08)';
    skirtCtx.fillRect(x, 0, 10, 512);
  }
  skirtCtx.fillStyle = '#0284c7';
  skirtCtx.fillRect(0, 444, 512, 18);
  skirtCtx.fillStyle = '#facc15';
  skirtCtx.fillRect(0, 466, 512, 8);
  const skirtMap = finalizeTexture(skirtC, 2, 1);

  // 5. Woven palm/rattan basket weave texture
  const [basketC, basketCtx] = createNoiseCanvas(512, 512);
  basketCtx.fillStyle = '#9a6432';
  basketCtx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 32; row++) {
    for (let col = 0; col < 16; col++) {
      const y = row * 16;
      const x = col * 32 + (row % 2 === 0 ? 0 : 16);
      basketCtx.fillStyle = (row + col) % 2 === 0 ? '#b98048' : '#7b4c21';
      basketCtx.fillRect(x - 16, y + 1, 28, 13);
      basketCtx.fillStyle = 'rgba(42, 22, 8, 0.32)';
      basketCtx.fillRect(x - 16, y + 13, 30, 3);
    }
  }
  const basketMap = finalizeTexture(basketC, 2, 2);

  // 6. Warm toasted flour tortilla / baleada texture with golden char blisters
  const [tortC, tortCtx] = createNoiseCanvas(256, 256);
  tortCtx.fillStyle = '#f0dec0';
  tortCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 65; i++) {
    const bx = (i * 59) % 240 + 8;
    const by = (i * 83) % 240 + 8;
    const br = 4 + (i % 10);
    const g = tortCtx.createRadialGradient(bx, by, 1, bx, by, br);
    g.addColorStop(0, i % 3 === 0 ? 'rgba(138, 72, 24, 0.52)' : 'rgba(196, 128, 56, 0.36)');
    g.addColorStop(1, 'rgba(240, 222, 192, 0)');
    tortCtx.fillStyle = g;
    tortCtx.beginPath();
    tortCtx.arc(bx, by, br, 0, Math.PI * 2);
    tortCtx.fill();
  }
  const tortillaMap = finalizeTexture(tortC);

  // 7. Soft contact shadow
  const [shadC, shadCtx] = createNoiseCanvas(128, 128);
  const shadGrad = shadCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
  shadGrad.addColorStop(0, 'rgba(6, 10, 18, 0.58)');
  shadGrad.addColorStop(0.65, 'rgba(6, 10, 18, 0.22)');
  shadGrad.addColorStop(1, 'rgba(6, 10, 18, 0)');
  shadCtx.fillStyle = shadGrad;
  shadCtx.fillRect(0, 0, 128, 128);
  const shadowMap = finalizeTexture(shadC);

  return { skinMap, blouseMap, apronMap, skirtMap, basketMap, tortillaMap, shadowMap };
}

/**
 * Construye el activo 3D fotorrealista completo de Doña Marisol (Vendedora de Baleadas)
 * con anatomía esculpida, blusa bordada, falda plisada, delantal detallado de manta,
 * joyería artesanal, moño trenzado, paño de cocina y canasta térmica llena de baleadas.
 */
export function createVendedoraBaleadasAsset(opts: CharacterBuildOptions): PlayerRig {
  const tex = createVendedoraTextures();
  const root = new THREE.Group();
  root.name = 'vendedora_baleadas_asset';

  const shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.18, 1.18),
    new THREE.MeshBasicMaterial({
      map: tex.shadowMap,
      transparent: true,
      depthWrite: false,
    }),
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.025;
  root.add(shadowMesh);

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // PBR Materials with rich roughness/metalness contrast
  const skinMat = new THREE.MeshStandardMaterial({
    map: tex.skinMap,
    roughness: 0.54,
    metalness: 0.02,
  });
  const blouseMat = new THREE.MeshStandardMaterial({
    map: tex.blouseMap,
    roughness: 0.78,
    metalness: 0.02,
  });
  const apronMat = new THREE.MeshStandardMaterial({
    map: tex.apronMap,
    roughness: 0.86,
    metalness: 0.02,
  });
  const skirtMat = new THREE.MeshStandardMaterial({
    map: tex.skirtMap,
    roughness: 0.82,
    metalness: 0.03,
    side: THREE.DoubleSide,
  });
  const turquoiseTrimMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.58,
    metalness: 0.06,
  });
  const goldMat = new THREE.MeshPhysicalMaterial({
    color: 0xfacc15,
    roughness: 0.2,
    metalness: 0.92,
    clearcoat: 0.4,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x161210,
    roughness: 0.72,
    metalness: 0.08,
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x452412,
    roughness: 0.52,
    metalness: 0.12,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x854d0e,
    roughness: 0.76,
  });
  const stainlessMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.24,
    metalness: 0.88,
  });
  const basketMat = new THREE.MeshStandardMaterial({
    map: tex.basketMap,
    roughness: 0.88,
    metalness: 0.03,
  });
  const tortillaMat = new THREE.MeshStandardMaterial({
    map: tex.tortillaMap,
    roughness: 0.84,
    metalness: 0.02,
  });

  // Hip-centered torso group (y = 0.88, natural 1.74m female stature)
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.88;
  bodyPivot.add(torsoGroup);

  // Sculpted female torso via LatheGeometry (waist curve -> ribcage -> shoulders)
  const torsoProfile = [
    new THREE.Vector2(0.142, 0.08),
    new THREE.Vector2(0.132, 0.16),
    new THREE.Vector2(0.148, 0.28),
    new THREE.Vector2(0.172, 0.41),
    new THREE.Vector2(0.176, 0.52),
    new THREE.Vector2(0.135, 0.59),
    new THREE.Vector2(0.082, 0.62),
  ];
  const sculptedTorsoGeo = new THREE.LatheGeometry(torsoProfile, 24);
  const sculptedTorso = new THREE.Mesh(sculptedTorsoGeo, blouseMat);
  sculptedTorso.scale.set(1.06, 1.0, 0.72);
  sculptedTorso.castShadow = true;
  sculptedTorso.receiveShadow = true;
  torsoGroup.add(sculptedTorso);

  // Embroidered peasant blouse neckline trim
  const blouseCollar = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.018, 10, 22), turquoiseTrimMat);
  blouseCollar.rotation.x = Math.PI / 2;
  blouseCollar.scale.set(1.15, 0.86, 1.0);
  blouseCollar.position.y = 0.585;
  torsoGroup.add(blouseCollar);

  // Pleated artisan midi skirt via LatheGeometry (flares gently so legs articulate freely)
  const skirtProfile = [
    new THREE.Vector2(0.146, 0.11),
    new THREE.Vector2(0.195, -0.02),
    new THREE.Vector2(0.242, -0.18),
    new THREE.Vector2(0.268, -0.34),
  ];
  const skirtMesh = new THREE.Mesh(new THREE.LatheGeometry(skirtProfile, 24), skirtMat);
  skirtMesh.scale.set(1.04, 1.0, 0.86);
  skirtMesh.castShadow = true;
  skirtMesh.receiveShadow = true;
  torsoGroup.add(skirtMesh);

  // Sculpted waistband sash & back bow
  const waistband = new THREE.Mesh(new THREE.CylinderGeometry(0.148, 0.156, 0.048, 20), turquoiseTrimMat);
  waistband.scale.set(1.06, 1.0, 0.78);
  waistband.position.y = 0.125;
  torsoGroup.add(waistband);

  // Front Apron (bib + wrap skirt + stitched pocket + halter + checkered kitchen cloth + spatula)
  const apronBib = new THREE.Mesh(new THREE.BoxGeometry(0.255, 0.31, 0.036), apronMat);
  apronBib.position.set(0, 0.34, -0.126);
  apronBib.castShadow = true;
  torsoGroup.add(apronBib);

  const apronSkirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.158, 0.238, 0.39, 20, 1, true, -Math.PI * 0.44, Math.PI * 0.88),
    apronMat,
  );
  apronSkirt.position.set(0, -0.06, -0.018);
  apronSkirt.rotation.y = Math.PI;
  apronSkirt.scale.set(1.04, 1, 0.88);
  apronSkirt.castShadow = true;
  torsoGroup.add(apronSkirt);

  // Apron halter neck loop (TubeGeometry)
  const halterCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.1, 0.48, -0.12),
    new THREE.Vector3(-0.085, 0.62, -0.04),
    new THREE.Vector3(0, 0.65, 0.06),
    new THREE.Vector3(0.085, 0.62, -0.04),
    new THREE.Vector3(0.1, 0.48, -0.12),
  ]);
  const halterStrap = new THREE.Mesh(
    new THREE.TubeGeometry(halterCurve, 18, 0.012, 8, false),
    turquoiseTrimMat,
  );
  torsoGroup.add(halterStrap);

  // Front embroidered apron pocket + folded red/white kitchen cloth + spatula
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.185, 0.115, 0.028), turquoiseTrimMat);
  pocket.position.set(0.02, 0.02, -0.175);
  pocket.rotation.x = 0.12;
  torsoGroup.add(pocket);

  const pocketBorder = new THREE.Mesh(
    new THREE.BoxGeometry(0.19, 0.018, 0.032),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 }),
  );
  pocketBorder.position.set(0.02, 0.072, -0.179);
  pocketBorder.rotation.x = 0.12;
  torsoGroup.add(pocketBorder);

  // Folded kitchen towel hanging cleanly from waist sash on right side
  const kitchenTowel = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.19, 0.035),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.92 }),
  );
  kitchenTowel.position.set(0.175, 0.02, -0.05);
  kitchenTowel.rotation.z = -0.08;
  kitchenTowel.castShadow = true;
  torsoGroup.add(kitchenTowel);

  const towelStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.074, 0.03, 0.038),
    new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.85 }),
  );
  towelStripe.position.set(0.18, -0.04, -0.05);
  towelStripe.rotation.z = -0.08;
  torsoGroup.add(towelStripe);

  // Comal turner / spatula tucked into waist apron loop on left side
  const spatulaGroup = new THREE.Group();
  spatulaGroup.position.set(-0.172, 0.06, -0.06);
  spatulaGroup.rotation.z = 0.18;
  const spatulaHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.13, 8), woodMat);
  spatulaHandle.position.y = 0.05;
  spatulaGroup.add(spatulaHandle);
  const spatulaBlade = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.08, 0.006), stainlessMat);
  spatulaBlade.position.y = -0.05;
  spatulaGroup.add(spatulaBlade);
  torsoGroup.add(spatulaGroup);

  // Beaded turquoise + gold necklace at collarbone
  const necklaceGroup = new THREE.Group();
  necklaceGroup.position.set(0, 0.565, -0.03);
  for (let i = -4; i <= 4; i++) {
    const angle = (i / 4) * 0.85;
    const bead = new THREE.Mesh(
      new THREE.SphereGeometry(i === 0 ? 0.015 : 0.011, 10, 10),
      i % 2 === 0 ? turquoiseTrimMat : goldMat,
    );
    bead.position.set(Math.sin(angle) * 0.095, -Math.cos(angle) * 0.025, -Math.cos(angle) * 0.082);
    necklaceGroup.add(bead);
  }
  torsoGroup.add(necklaceGroup);

  // Coin pouch (cangurera / monedero para monedas de 5¢) on left hip
  const coinPouch = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.095, 0.055), leatherMat);
  coinPouch.position.set(-0.185, 0.09, 0.03);
  coinPouch.castShadow = true;
  torsoGroup.add(coinPouch);

  // Artisan Woven Thermal Baleada Basket carried ergonomically on back harness
  const basketGroup = new THREE.Group();
  basketGroup.position.set(0, 0.34, 0.255);
  basketGroup.rotation.x = 0.08;

  const basketProfile = [
    new THREE.Vector2(0.0, -0.145),
    new THREE.Vector2(0.145, -0.145),
    new THREE.Vector2(0.175, -0.02),
    new THREE.Vector2(0.205, 0.135),
    new THREE.Vector2(0.188, 0.135),
    new THREE.Vector2(0.16, 0.0),
    new THREE.Vector2(0.0, -0.12),
  ];
  const basketShell = new THREE.Mesh(new THREE.LatheGeometry(basketProfile, 24), basketMat);
  basketShell.castShadow = true;
  basketShell.receiveShadow = true;
  basketGroup.add(basketShell);

  const basketRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.198, 0.022, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 }),
  );
  basketRim.rotation.x = Math.PI / 2;
  basketRim.position.y = 0.135;
  basketGroup.add(basketRim);

  // Warm folded baleadas & tortillas peeking inside thermal basket
  for (let i = 0; i < 4; i++) {
    const bal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.105, 0.026, 16, 1, false, 0, Math.PI),
      tortillaMat,
    );
    bal.position.set((i - 1.5) * 0.048, 0.085 + (i % 2) * 0.015, 0.02);
    bal.rotation.set(0.35, i * 0.45, 0.2);
    basketGroup.add(bal);
  }

  // Folded crisp white thermal cloth covering half the basket + Honduran stripe
  const mantel = new THREE.Mesh(
    new THREE.SphereGeometry(0.182, 18, 12, 0, Math.PI * 1.45, 0, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.92, side: THREE.DoubleSide }),
  );
  mantel.position.y = 0.11;
  mantel.rotation.y = 0.4;
  basketGroup.add(mantel);

  const mantelStripe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.026, 0.065), turquoiseTrimMat);
  mantelStripe.position.set(0, 0.175, -0.04);
  basketGroup.add(mantelStripe);

  // Leather cross-harness straps securing the basket tightly over shoulders
  [-0.125, 0.125].forEach((sx) => {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.4, 0.19), leatherMat);
    strap.position.set(sx, 0.05, -0.145);
    basketGroup.add(strap);
  });
  torsoGroup.add(basketGroup);

  // Head & Neck (Sculpted realistic features + braided bun)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.62, 0);
  torsoGroup.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.066, 0.105, 16), skinMat);
  neck.position.y = 0.042;
  headGroup.add(neck);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 22), skinMat);
  skull.position.y = 0.185;
  skull.scale.set(0.9, 1.07, 0.96);
  skull.castShadow = true;
  headGroup.add(skull);

  // Warm subtle cheekbones & nose bridge
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 10), skinMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0.182, -0.126);
  headGroup.add(nose);

  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.22 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.1 });
  [-0.043, 0.043].forEach((ex) => {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.019, 12, 12), eyeWhiteMat);
    sclera.position.set(ex, 0.205, -0.11);
    headGroup.add(sclera);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 10), irisMat);
    iris.position.set(ex, 0.205, -0.12);
    headGroup.add(iris);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), pupilMat);
    pupil.position.set(ex, 0.205, -0.126);
    headGroup.add(pupil);

    const lash = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.006, 0.012), hairMat);
    lash.position.set(ex, 0.22, -0.12);
    headGroup.add(lash);
  });

  const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.01, 0.014), hairMat);
  leftBrow.position.set(-0.043, 0.236, -0.118);
  headGroup.add(leftBrow);

  const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.01, 0.014), hairMat);
  rightBrow.position.set(0.043, 0.236, -0.118);
  headGroup.add(rightBrow);

  const mouthMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.048, 0.012, 0.014),
    new THREE.MeshStandardMaterial({ color: 0x9f3f36, roughness: 0.42 }),
  );
  mouthMesh.position.set(0, 0.128, -0.12);
  headGroup.add(mouthMesh);

  // Detailed Hair Cap, side framing locks & Braided Chignon Bun + Turquoise Hair Ribbon
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.136, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat,
  );
  hairCap.position.y = 0.194;
  hairCap.scale.set(0.92, 1.06, 0.99);
  hairCap.rotation.x = 0.18;
  headGroup.add(hairCap);

  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.124, 18, 16), hairMat);
  hairBack.position.set(0, 0.172, 0.048);
  hairBack.scale.set(0.9, 1.0, 0.88);
  headGroup.add(hairBack);

  // Braided chignon bun composed of overlapping coiled rings
  const bunCore = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 14), hairMat);
  bunCore.position.set(0, 0.205, 0.154);
  bunCore.castShadow = true;
  headGroup.add(bunCore);

  const braidCoil = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.022, 10, 18), hairMat);
  braidCoil.position.set(0, 0.205, 0.148);
  headGroup.add(braidCoil);

  const hairRibbon = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.014, 10, 20), turquoiseTrimMat);
  hairRibbon.position.set(0, 0.205, 0.125);
  headGroup.add(hairRibbon);

  // Gold filigree hoop earrings
  [-0.122, 0.122].forEach((ex) => {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0045, 8, 16), goldMat);
    hoop.position.set(ex, 0.145, -0.01);
    hoop.rotation.y = Math.PI / 2;
    headGroup.add(hoop);
  });

  // Optional player-equipped sunglasses override
  if (opts.accessoryId === 'lentes_aviador' || opts.accessoryId === 'lentes_deportivos') {
    const frameMat = new THREE.MeshStandardMaterial({
      color: opts.accessoryId === 'lentes_aviador' ? 0xca8a04 : 0x0ea5e9,
      roughness: 0.25,
      metalness: 0.85,
    });
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.1, metalness: 0.85 });
    [-0.044, 0.044].forEach((lx) => {
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.036, 0.02), lensMat);
      lens.position.set(lx, 0.202, -0.132);
      headGroup.add(lens);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.012, 0.018), frameMat);
    bridge.position.set(0, 0.214, -0.132);
    headGroup.add(bridge);
  }

  // Articulated 2-segment Arms with Embroidered Puff Sleeves & Artisan Bracelets
  const makeArm = (side: -1 | 1): { upper: THREE.Group; forearm: THREE.Group } => {
    const upper = new THREE.Group();
    upper.position.set(side * 0.228, 0.54, 0);

    const puffSleeve = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 12), blouseMat);
    puffSleeve.scale.set(1.0, 1.12, 1.0);
    upper.add(puffSleeve);

    const sleeveTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.058, 0.035, 14), turquoiseTrimMat);
    sleeveTrim.position.y = -0.055;
    upper.add(sleeveTrim);

    const bicep = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.24, 12), skinMat);
    bicep.position.y = -0.14;
    bicep.castShadow = true;
    upper.add(bicep);

    const forearm = new THREE.Group();
    forearm.position.y = -0.26;
    upper.add(forearm);

    const lowerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.028, 0.235, 12), skinMat);
    lowerArm.position.y = -0.118;
    lowerArm.castShadow = true;
    forearm.add(lowerArm);

    // Artisan bracelet (or watch if tactical watch equipped)
    const bangle = new THREE.Mesh(
      new THREE.TorusGeometry(0.034, 0.006, 8, 14),
      side === -1 && opts.accessoryId === 'reloj_tactico' ? stainlessMat : goldMat,
    );
    bangle.rotation.x = Math.PI / 2;
    bangle.position.y = -0.205;
    forearm.add(bangle);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), skinMat);
    hand.position.y = -0.265;
    forearm.add(hand);

    return { upper, forearm };
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  torsoGroup.add(leftArm.upper);
  torsoGroup.add(rightArm.upper);

  // Articulated 2-segment Legs beneath skirt + leather huarache shoes
  const makeLeg = (side: -1 | 1): { thigh: THREE.Group; shin: THREE.Group } => {
    const thigh = new THREE.Group();
    thigh.position.set(side * 0.095, 0.88, 0);

    const thighMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.058, 0.41, 14), skinMat);
    thighMesh.position.y = -0.205;
    thighMesh.castShadow = true;
    thigh.add(thighMesh);

    const shin = new THREE.Group();
    shin.position.y = -0.41;
    thigh.add(shin);

    const shinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.042, 0.39, 14), skinMat);
    shinMesh.position.y = -0.195;
    shinMesh.castShadow = true;
    shin.add(shinMesh);

    // Comfortable stitched leather market shoe + woven instep strap
    const shoeUpper = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.072, 0.225), leatherMat);
    shoeUpper.position.set(0, -0.415, -0.038);
    shoeUpper.castShadow = true;
    shin.add(shoeUpper);

    const ankleStrap = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.025, 12), leatherMat);
    ankleStrap.position.set(0, -0.372, 0);
    shin.add(ankleStrap);

    const shoeSole = new THREE.Mesh(
      new THREE.BoxGeometry(0.114, 0.026, 0.236),
      new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 }),
    );
    shoeSole.position.set(0, -0.455, -0.038);
    shin.add(shoeSole);

    return { thigh, shin };
  };

  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  bodyPivot.add(leftLeg.thigh);
  bodyPivot.add(rightLeg.thigh);

  return {
    root,
    bodyPivot,
    headGroup,
    torsoGroup,
    leftUpperArm: leftArm.upper,
    leftForearm: leftArm.forearm,
    rightUpperArm: rightArm.upper,
    rightForearm: rightArm.forearm,
    leftThigh: leftLeg.thigh,
    leftShin: leftLeg.shin,
    rightThigh: rightLeg.thigh,
    rightShin: rightLeg.shin,
    leftBrow,
    rightBrow,
    mouthMesh,
    shadowMesh,
  };
}

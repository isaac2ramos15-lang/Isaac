import * as THREE from 'three';
import { CHARACTER_CATALOG, type CityCatalogItem } from '../data/catalog';
import type {
  AccessoryId,
  BackpackId,
  CharacterId,
  CityId,
  HatId,
  OutfitId,
  ShoeId,
} from '../types/game';
import type { GameTextureSet } from './textures';
import { createVendedoraBaleadasAsset } from './vendedoraBaleadasAsset';

export interface PlayerRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  torsoGroup: THREE.Group;
  leftUpperArm: THREE.Group;
  leftForearm: THREE.Group;
  rightUpperArm: THREE.Group;
  rightForearm: THREE.Group;
  leftThigh: THREE.Group;
  leftShin: THREE.Group;
  rightThigh: THREE.Group;
  rightShin: THREE.Group;
  leftBrow: THREE.Mesh;
  rightBrow: THREE.Mesh;
  mouthMesh: THREE.Mesh;
  shadowMesh: THREE.Mesh;
}

export interface PoliceRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  ticketMesh: THREE.Mesh;
}

export interface GuacamayaRig {
  root: THREE.Group;
  leftWingPivot: THREE.Group;
  rightWingPivot: THREE.Group;
}

export interface CharacterBuildOptions {
  characterId: CharacterId;
  outfitId: OutfitId;
  shoeId: ShoeId;
  hatId: HatId;
  backpackId: BackpackId;
  accessoryId: AccessoryId;
}

const _contactShadowTex = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(6, 10, 18, 0.58)');
  grad.addColorStop(0.65, 'rgba(6, 10, 18, 0.22)');
  grad.addColorStop(1, 'rgba(6, 10, 18, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
})();

function makeRealisticWheel(radius: number, width: number, dual = false): THREE.Group {
  const wheel = new THREE.Group();
  wheel.userData.wheelSpinRadius = radius;
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x16181d,
    roughness: 0.88,
    metalness: 0.06,
  });
  const alloyMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.25,
    metalness: 0.86,
  });
  const lugMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.35,
    metalness: 0.72,
  });

  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, dual ? width * 1.45 : width, 24),
    tireMat,
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  wheel.add(tire);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, (dual ? width * 1.45 : width) + 0.02, 18),
    alloyMat,
  );
  rim.rotation.z = Math.PI / 2;
  wheel.add(rim);

  const hubCap = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.24, radius * 0.24, (dual ? width * 1.45 : width) + 0.04, 12),
    lugMat,
  );
  hubCap.rotation.z = Math.PI / 2;
  wheel.add(hubCap);

  // Subtle lug-nut markers so wheel spin reads clearly in motion
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const lug = new THREE.Mesh(new THREE.BoxGeometry((dual ? width * 1.45 : width) + 0.04, 0.04, 0.04), lugMat);
    lug.position.set(0, Math.cos(a) * radius * 0.42, Math.sin(a) * radius * 0.42);
    wheel.add(lug);
  }

  return wheel;
}

function createCarPaintMaterial(colorHex: number): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: colorHex,
    roughness: 0.28,
    metalness: 0.35,
    clearcoat: 0.9,
    clearcoatRoughness: 0.14,
  });
}

export function createRealisticHumanCharacter(opts: CharacterBuildOptions): PlayerRig {
  if (opts.characterId === 'vendedora_baleadas') {
    return createVendedoraBaleadasAsset(opts);
  }
  const root = new THREE.Group();

  const shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshBasicMaterial({
      map: _contactShadowTex,
      transparent: true,
      depthWrite: false,
    }),
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.025;
  root.add(shadowMesh);

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const charMeta =
    CHARACTER_CATALOG.find((c) => c.id === opts.characterId) ?? CHARACTER_CATALOG[0];
  const app = charMeta.appearance;

  // Apply customized gear overrides for protagonist, or character-specific look
  const outfitColorMap: Record<OutfitId, { primary: number; accent: number }> = {
    urbano_tegus: { primary: 0x1d4ed8, accent: 0xf8fafc },
    azul_nacional: { primary: 0x0284c7, accent: 0xf1f5f9 },
    ejecutivo_sps: { primary: 0x334155, accent: 0xe2e8f0 },
    safari_copan: { primary: 0x854d0e, accent: 0x3f6212 },
    moto_cuero: { primary: 0x18181b, accent: 0x991b1b },
    historico_morazan: { primary: 0x172554, accent: 0xeab308 },
  };
  const shoeColorMap: Record<ShoeId, number> = {
    tenis_urbanos: 0xe2e8f0,
    botas_tacticas: 0x111827,
    tacos_futbol: 0xeab308,
    botas_campo: 0x78350f,
  };

  const torsoColor =
    opts.characterId === 'protagonist' ? outfitColorMap[opts.outfitId].primary : app.torsoHex;
  const accentColor =
    opts.characterId === 'protagonist' ? outfitColorMap[opts.outfitId].accent : app.accentHex;
  const shoeColor =
    opts.characterId === 'protagonist' ? shoeColorMap[opts.shoeId] : app.shoeHex;
  const hatToUse: HatId =
    opts.characterId === 'protagonist' ? opts.hatId : app.defaultHat;
  const backpackToUse: BackpackId =
    opts.characterId === 'protagonist' ? opts.backpackId : app.defaultBackpack;

  const skinMat = new THREE.MeshStandardMaterial({
    color: app.skinHex,
    roughness: 0.62,
    metalness: 0.02,
  });
  const torsoMat = new THREE.MeshStandardMaterial({
    color: torsoColor,
    roughness: app.isJacket ? 0.58 : 0.75,
    metalness: app.isHistoric ? 0.14 : 0.04,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: app.isHistoric ? 0.25 : 0.55,
    metalness: app.isHistoric ? 0.78 : 0.08,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: app.pantsHex,
    roughness: 0.82,
    metalness: 0.03,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: shoeColor,
    roughness: 0.45,
    metalness: 0.12,
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.88,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: app.hairHex,
    roughness: 0.85,
  });

  // Realistic human proportions (~1.78m height, hip joint at y = 0.88)
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.88;
  bodyPivot.add(torsoGroup);

  const isFemale = Boolean(app.isFemale);

  // Pelvis / Skirt drape
  const pelvis = new THREE.Mesh(
    new THREE.CylinderGeometry(isFemale ? 0.155 : 0.165, isFemale ? 0.215 : 0.175, isFemale ? 0.26 : 0.16, 16),
    pantsMat,
  );
  pelvis.position.y = isFemale ? 0.0 : 0.04;
  pelvis.scale.set(isFemale ? 1.12 : 1.18, 1, isFemale ? 0.88 : 0.78);
  pelvis.castShadow = true;
  torsoGroup.add(pelvis);

  // Belt / Apron Waistband
  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(isFemale ? 0.15 : 0.17, isFemale ? 0.155 : 0.17, 0.045, 16),
    new THREE.MeshStandardMaterial({
      color: isFemale ? accentColor : 0x18181b,
      roughness: isFemale ? 0.65 : 0.45,
      metalness: isFemale ? 0.05 : 0.3,
    }),
  );
  belt.position.y = 0.13;
  belt.scale.set(isFemale ? 1.1 : 1.18, 1, isFemale ? 0.8 : 0.79);
  torsoGroup.add(belt);

  // Sculpted Torso / Ribcage
  const ribcage = new THREE.Mesh(
    new THREE.CylinderGeometry(isFemale ? 0.175 : 0.205, isFemale ? 0.142 : 0.165, 0.48, 16),
    torsoMat,
  );
  ribcage.position.y = 0.36;
  ribcage.scale.set(isFemale ? 1.08 : 1.16, 1, isFemale ? 0.72 : 0.74);
  ribcage.castShadow = true;
  torsoGroup.add(ribcage);

  // Collar / Embroidered Yoke
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.08, 14), accentMat);
  collar.position.y = 0.59;
  torsoGroup.add(collar);

  if (app.isHistoric) {
    // Francisco Morazán ceremonial sash, coat tails & gold epaulettes
    const sash = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.08, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 }),
    );
    sash.position.y = 0.36;
    sash.rotation.z = 0.38;
    torsoGroup.add(sash);

    const coatTail = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.08), torsoMat);
    coatTail.position.set(0, -0.02, 0.12);
    torsoGroup.add(coatTail);

    [-0.22, 0.22].forEach((ex) => {
      const ep = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.18), accentMat);
      ep.position.set(ex, 0.59, 0);
      torsoGroup.add(ep);
    });
  } else if (app.hasVest) {
    const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.214, 0.175, 0.38, 16), accentMat);
    vest.position.y = 0.36;
    vest.scale.set(1.16, 1, 0.76);
    torsoGroup.add(vest);
  } else if (app.hasApron) {
    if (isFemale) {
      // Realistic crisp white canvas apron with Honduran turquoise border, pocket & folded tortilla cloth
      const whiteApronMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85 });
      const apronBib = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.32, 0.045), whiteApronMat);
      apronBib.position.set(0, 0.34, -0.13);
      apronBib.castShadow = true;
      torsoGroup.add(apronBib);

      const apronSkirt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.168, 0.225, 0.36, 14, 1, false, -Math.PI * 0.42, Math.PI * 0.84),
        whiteApronMat,
      );
      apronSkirt.position.set(0, -0.03, -0.02);
      apronSkirt.rotation.y = Math.PI;
      torsoGroup.add(apronSkirt);

      const trimStripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.05), accentMat);
      trimStripe.position.set(0, 0.48, -0.132);
      torsoGroup.add(trimStripe);

      const apronPocket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.03), accentMat);
      apronPocket.position.set(0.02, 0.03, -0.175);
      torsoGroup.add(apronPocket);

      const clothNapkin = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.08, 0.025),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 }),
      );
      clothNapkin.position.set(0.02, 0.09, -0.18);
      clothNapkin.rotation.z = -0.12;
      torsoGroup.add(clothNapkin);

      // Embroidered traditional floral shoulder trim
      [-0.14, 0.14].forEach((sx) => {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.03, 0.24), accentMat);
        trim.position.set(sx, 0.56, 0);
        torsoGroup.add(trim);
      });
    } else {
      const apron = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.52, 0.05), accentMat);
      apron.position.set(0, 0.18, -0.14);
      torsoGroup.add(apron);
    }
  } else if (app.hasTie) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.03), accentMat);
    tie.position.set(0, 0.4, -0.15);
    torsoGroup.add(tie);
  }

  // Artisan woven thermal basket for Baleada Vendor (strapped securely so arms run naturally)
  if (app.hasVendorBasket) {
    const basketGroup = new THREE.Group();
    basketGroup.position.set(0, 0.33, 0.24);
    const rattanMat = new THREE.MeshStandardMaterial({ color: 0xb47b44, roughness: 0.88 });
    const weaveMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.9 });
    const basketBody = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.15, 0.28, 16), rattanMat);
    basketBody.castShadow = true;
    basketGroup.add(basketBody);

    const basketRim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.024, 8, 18), weaveMat);
    basketRim.rotation.x = Math.PI / 2;
    basketRim.position.y = 0.135;
    basketGroup.add(basketRim);

    const thermalCloth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.175, 0.185, 0.05, 16),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.92 }),
    );
    thermalCloth.position.y = 0.15;
    basketGroup.add(thermalCloth);

    const clothFold = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.03, 0.08),
      accentMat,
    );
    clothFold.position.set(0, 0.175, 0);
    basketGroup.add(clothFold);

    // Shoulder harness straps
    [-0.12, 0.12].forEach((sx) => {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.18), accentMat);
      strap.position.set(sx, 0.06, -0.14);
      basketGroup.add(strap);
    });
    torsoGroup.add(basketGroup);
  } else if (backpackToUse !== 'ninguna') {
    const packColor =
      backpackToUse === 'mochila_reparto'
        ? 0xc2410c
        : backpackToUse === 'mochila_expedicion'
          ? 0x3f6212
          : 0x27272a;
    const packSize: [number, number, number] =
      backpackToUse === 'mochila_reparto' ? [0.36, 0.4, 0.28] : [0.3, 0.38, 0.16];
    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(...packSize),
      new THREE.MeshStandardMaterial({ color: packColor, roughness: 0.72 }),
    );
    pack.position.set(0, 0.35, 0.19);
    pack.castShadow = true;
    torsoGroup.add(pack);
  }

  // Head & Neck (realistic 1:7.5 head ratio)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.62, 0);
  torsoGroup.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.068, 0.1, 12), skinMat);
  neck.position.y = 0.04;
  headGroup.add(neck);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.132, 20, 18), skinMat);
  skull.position.y = 0.185;
  skull.scale.set(0.92, 1.08, 0.98);
  skull.castShadow = true;
  headGroup.add(skull);

  // Subtle nose bridge for realistic silhouette
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.055, 6), skinMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0.18, -0.132);
  headGroup.add(nose);

  // Realistic Eyes & Expressive Brows/Mouth (animated during intro story!)
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.15 });
  const whiteEyeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
  [-0.045, 0.045].forEach((ex) => {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 10), whiteEyeMat);
    sclera.position.set(ex, 0.205, -0.112);
    headGroup.add(sclera);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), eyeMat);
    pupil.position.set(ex, 0.205, -0.125);
    headGroup.add(pupil);
  });

  const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.012, 0.016), hairMat);
  leftBrow.position.set(-0.045, 0.236, -0.122);
  headGroup.add(leftBrow);

  const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.012, 0.016), hairMat);
  rightBrow.position.set(0.045, 0.236, -0.122);
  headGroup.add(rightBrow);

  const mouthMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.052, 0.012, 0.015),
    new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.55 }),
  );
  mouthMesh.position.set(0, 0.125, -0.122);
  headGroup.add(mouthMesh);

  // Hair
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.138, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat,
  );
  hairCap.position.y = 0.195;
  hairCap.scale.set(0.94, 1.06, 1.0);
  hairCap.rotation.x = 0.18;
  headGroup.add(hairCap);

  if (isFemale) {
    // Sculpted back hair & braided bun (moño trenzado) + turquoise ribbon + gold hoop earrings
    const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 12), hairMat);
    hairBack.position.set(0, 0.17, 0.045);
    hairBack.scale.set(0.92, 1.0, 0.9);
    headGroup.add(hairBack);

    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 12), hairMat);
    bun.position.set(0, 0.21, 0.155);
    bun.castShadow = true;
    headGroup.add(bun);

    const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.015, 8, 16), accentMat);
    ribbon.position.set(0, 0.21, 0.13);
    headGroup.add(ribbon);

    const goldEarringMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.2,
      metalness: 0.9,
    });
    [-0.126, 0.126].forEach((ex) => {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 12), goldEarringMat);
      hoop.position.set(ex, 0.145, -0.01);
      hoop.rotation.y = Math.PI / 2;
      headGroup.add(hoop);
    });
  }

  // Hats & Helmets
  if (hatToUse === 'bicornio') {
    const bMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.65 });
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.2), bMat);
    brim.position.set(0, 0.31, 0);
    headGroup.add(brim);
    const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.16, 12), bMat);
    crest.position.set(0, 0.36, 0);
    headGroup.add(crest);
    const cockade = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12), accentMat);
    cockade.rotation.x = Math.PI / 2;
    cockade.position.set(0, 0.34, -0.11);
    headGroup.add(cockade);
  } else if (hatToUse === 'gorra_catracha') {
    const capMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.65 });
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.144, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
      capMat,
    );
    dome.position.y = 0.205;
    headGroup.add(dome);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.022, 0.14), capMat);
    visor.position.set(0, 0.245, -0.14);
    headGroup.add(visor);
  } else if (hatToUse === 'sombrero_junco') {
    const strawMat = new THREE.MeshStandardMaterial({ color: 0xd4b483, roughness: 0.88 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.3, 0.024, 20), strawMat);
    brim.position.y = 0.28;
    headGroup.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.12, 16), strawMat);
    crown.position.y = 0.34;
    headGroup.add(crown);
  } else if (hatToUse === 'casco_moto') {
    const helmetMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      roughness: 0.22,
      metalness: 0.3,
      clearcoat: 0.9,
    });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.165, 18, 16), helmetMat);
    shell.position.y = 0.2;
    headGroup.add(shell);
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.09, 0.12),
      new THREE.MeshPhysicalMaterial({ color: 0x090d16, roughness: 0.1, metalness: 0.8, clearcoat: 1 }),
    );
    visor.position.set(0, 0.205, -0.115);
    headGroup.add(visor);
  } else if (hatToUse === 'casco_obra') {
    const hardHat = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 }),
    );
    hardHat.position.y = 0.21;
    headGroup.add(hardHat);
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.02, 16),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 }),
    );
    brim.position.set(0, 0.23, -0.02);
    headGroup.add(brim);
  }

  // Sunglasses accessory
  if (opts.accessoryId === 'lentes_aviador' || opts.accessoryId === 'lentes_deportivos') {
    const frameMat = new THREE.MeshStandardMaterial({
      color: opts.accessoryId === 'lentes_aviador' ? 0xca8a04 : 0x0ea5e9,
      roughness: 0.25,
      metalness: 0.85,
    });
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.1, metalness: 0.85 });
    [-0.046, 0.046].forEach((lx) => {
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.038, 0.02), lensMat);
      lens.position.set(lx, 0.202, -0.135);
      headGroup.add(lens);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, 0.018), frameMat);
    bridge.position.set(0, 0.215, -0.135);
    headGroup.add(bridge);
  }

  // Articulated 2-segment Arms (Upper Arm + Forearm/Hand)
  const makeArm = (side: -1 | 1): { upper: THREE.Group; forearm: THREE.Group } => {
    const upper = new THREE.Group();
    upper.position.set(side * (isFemale ? 0.232 : 0.265), 0.54, 0);

    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(isFemale ? 0.054 : 0.062, 10, 10), torsoMat);
    upper.add(shoulder);

    const bicep = new THREE.Mesh(
      new THREE.CylinderGeometry(isFemale ? 0.044 : 0.052, isFemale ? 0.038 : 0.044, 0.26, 10),
      isFemale ? skinMat : torsoMat,
    );
    bicep.position.y = -0.13;
    bicep.castShadow = true;
    upper.add(bicep);

    if (isFemale) {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.052, 0.12, 10), torsoMat);
      sleeve.position.y = -0.05;
      upper.add(sleeve);
    }

    const forearm = new THREE.Group();
    forearm.position.y = -0.26;
    upper.add(forearm);

    const lowerMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(isFemale ? 0.036 : 0.042, isFemale ? 0.03 : 0.034, 0.24, 10),
      app.isJacket || app.isHistoric ? torsoMat : skinMat,
    );
    lowerMesh.position.y = -0.12;
    lowerMesh.castShadow = true;
    forearm.add(lowerMesh);

    if (side === -1 && opts.accessoryId === 'reloj_tactico') {
      const watch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.035, 12),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 }),
      );
      watch.position.y = -0.21;
      forearm.add(watch);
    }

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), skinMat);
    hand.position.y = -0.27;
    forearm.add(hand);

    return { upper, forearm };
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  torsoGroup.add(leftArm.upper);
  torsoGroup.add(rightArm.upper);

  // Articulated 2-segment Legs (Thigh + Shin + Shoe)
  const makeLeg = (side: -1 | 1): { thigh: THREE.Group; shin: THREE.Group } => {
    const thigh = new THREE.Group();
    thigh.position.set(side * 0.1, 0.88, 0);

    const thighMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.066, 0.41, 12), pantsMat);
    thighMesh.position.y = -0.205;
    thighMesh.castShadow = true;
    thigh.add(thighMesh);

    const shin = new THREE.Group();
    shin.position.y = -0.41;
    thigh.add(shin);

    const shinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.046, 0.39, 12), pantsMat);
    shinMesh.position.y = -0.195;
    shinMesh.castShadow = true;
    shin.add(shinMesh);

    const shoeUpper = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.085, 0.24), shoeMat);
    shoeUpper.position.set(0, -0.41, -0.04);
    shoeUpper.castShadow = true;
    shin.add(shoeUpper);

    const shoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.03, 0.25), soleMat);
    shoeSole.position.set(0, -0.455, -0.04);
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

export function createPoliceOfficerModel(): PoliceRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const uniformMat = new THREE.MeshStandardMaterial({ color: 0x172554, roughness: 0.68 });
  const darkPantsMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.78 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xb67a54, roughness: 0.62 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.22, metalness: 0.88 });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.17, 0.56, 14), uniformMat);
  torso.position.y = 1.16;
  torso.scale.set(1.15, 1, 0.78);
  torso.castShadow = true;
  bodyPivot.add(torso);

  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 8), goldMat);
  badge.rotation.x = Math.PI / 2;
  badge.position.set(-0.1, 1.28, -0.15);
  bodyPivot.add(badge);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 14), skinMat);
  head.position.y = 1.62;
  head.scale.set(0.92, 1.08, 0.98);
  head.castShadow = true;
  bodyPivot.add(head);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.14, 0.09, 14), uniformMat);
  cap.position.y = 1.74;
  bodyPivot.add(cap);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.12), darkPantsMat);
  visor.position.set(0, 1.7, -0.14);
  bodyPivot.add(visor);

  const makeArm = (side: -1 | 1): THREE.Group => {
    const p = new THREE.Group();
    p.position.set(side * 0.27, 1.38, 0);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.04, 0.48, 10), uniformMat);
    arm.position.y = -0.22;
    arm.castShadow = true;
    p.add(arm);
    return p;
  };
  const leftArmPivot = makeArm(-1);
  const rightArmPivot = makeArm(1);
  bodyPivot.add(leftArmPivot);
  bodyPivot.add(rightArmPivot);

  const ticketMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.28, 0.025),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.65 }),
  );
  ticketMesh.position.set(0, -0.46, -0.1);
  rightArmPivot.add(ticketMesh);

  const makeLeg = (side: -1 | 1): THREE.Group => {
    const p = new THREE.Group();
    p.position.set(side * 0.1, 0.88, 0);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.054, 0.82, 10), darkPantsMat);
    leg.position.y = -0.41;
    leg.castShadow = true;
    p.add(leg);
    return p;
  };
  const leftLegPivot = makeLeg(-1);
  const rightLegPivot = makeLeg(1);
  bodyPivot.add(leftLegPivot);
  bodyPivot.add(rightLegPivot);

  return {
    root,
    bodyPivot,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    ticketMesh,
  };
}

export function createCarModel(colorHex = 0x1e40af): THREE.Group {
  const group = new THREE.Group();
  const paintMat = createCarPaintMaterial(colorHex);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.08,
    metalness: 0.25,
    clearcoat: 1.0,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.65 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.18, metalness: 0.9 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 0.9,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 0.75,
  });

  // Lower chassis
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.64, 4.1), paintMat);
  hull.position.y = 0.64;
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  // Sloped upper cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.54, 2.05), paintMat);
  cabin.position.set(0, 1.2, -0.12);
  cabin.castShadow = true;
  group.add(cabin);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.44, 2.12), glassMat);
  glass.position.set(0, 1.18, -0.12);
  group.add(glass);

  // Side mirrors
  [-0.98, 0.98].forEach((mx) => {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.16), paintMat);
    mirror.position.set(mx, 1.02, 0.62);
    group.add(mirror);
  });

  // Bumpers & grille
  const fBumper = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.18), trimMat);
  fBumper.position.set(0, 0.42, 2.08);
  group.add(fBumper);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.26, 0.08), chromeMat);
  grille.position.set(0, 0.64, 2.06);
  group.add(grille);

  [-0.72, 0.72].forEach((lx) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.08), headlightMat);
    hl.position.set(lx, 0.7, 2.06);
    group.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), taillightMat);
    tl.position.set(lx, 0.72, -2.06);
    group.add(tl);
  });

  [
    [-0.96, 1.28],
    [0.96, 1.28],
    [-0.96, -1.28],
    [0.96, -1.28],
  ].forEach(([wx, wz]) => {
    const w = makeRealisticWheel(0.34, 0.22);
    w.position.set(wx, 0.34, wz);
    group.add(w);
  });

  return group;
}

export function createTruckModel(): THREE.Group {
  const group = new THREE.Group();
  const cabMat = createCarPaintMaterial(0xb91c1c);
  const cargoMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.55, metalness: 0.18 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72, metalness: 0.45 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.1, clearcoat: 1 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.18, metalness: 0.9 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.85,
  });

  // Heavy cab (+Z front)
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.26, 1.82, 1.75), cabMat);
  cab.position.set(0, 1.38, 1.88);
  cab.castShadow = true;
  group.add(cab);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.68, 0.08), glassMat);
  windshield.position.set(0, 1.78, 2.75);
  group.add(windshield);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.56, 0.08), chromeMat);
  grille.position.set(0, 1.0, 2.76);
  group.add(grille);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.26, 0.22), chromeMat);
  bumper.position.set(0, 0.5, 2.78);
  group.add(bumper);

  [-0.86, 0.86].forEach((lx) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.08), headlightMat);
    hl.position.set(lx, 0.92, 2.76);
    group.add(hl);
  });

  // Cargo Container Box
  const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.42, 2.38, 4.15), cargoMat);
  cargo.position.set(0, 1.85, -1.12);
  cargo.castShadow = true;
  cargo.receiveShadow = true;
  group.add(cargo);

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.3, 5.8), frameMat);
  chassis.position.set(0, 0.55, -0.1);
  group.add(chassis);

  [
    [-1.12, 1.85],
    [1.12, 1.85],
    [-1.14, -1.35],
    [1.14, -1.35],
    [-1.14, -2.35],
    [1.14, -2.35],
  ].forEach(([wx, wz]) => {
    const w = makeRealisticWheel(0.44, 0.28);
    w.position.set(wx, 0.44, wz);
    group.add(w);
  });

  return group;
}

function addBusMirrorsAndWipers(
  group: THREE.Group,
  halfWidth: number,
  frontZ: number,
  mirrorY: number,
  wiperY: number,
): void {
  const armMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.75 });
  const mirrorGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x94a3b8,
    roughness: 0.08,
    metalness: 0.9,
    clearcoat: 1,
  });

  [-1, 1].forEach((side) => {
    const topArm = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.035, 0.035), armMat);
    topArm.position.set(side * (halfWidth + 0.14), mirrorY + 0.16, frontZ + 0.12);
    group.add(topArm);

    const lowArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.03), armMat);
    lowArm.position.set(side * (halfWidth + 0.12), mirrorY - 0.16, frontZ + 0.1);
    group.add(lowArm);

    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.34, 0.16), armMat);
    housing.position.set(side * (halfWidth + 0.28), mirrorY, frontZ + 0.14);
    housing.castShadow = true;
    group.add(housing);

    const mirrorFace = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.28), mirrorGlassMat);
    mirrorFace.position.set(side * (halfWidth + 0.28), mirrorY, frontZ + 0.055);
    mirrorFace.rotation.y = Math.PI;
    group.add(mirrorFace);
  });

  [-0.45, 0.45].forEach((wx) => {
    const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 0.03), armMat);
    wiper.position.set(wx, wiperY, frontZ + 0.05);
    wiper.rotation.z = 0.22;
    group.add(wiper);
  });
}

function addSegmentedBusWindows(
  group: THREE.Group,
  halfWidth: number,
  winY: number,
  winHeight: number,
  zStart: number,
  zEnd: number,
  paneCount: number,
  glassMat: THREE.Material,
  pillarMat: THREE.Material,
): void {
  const span = Math.abs(zEnd - zStart);
  const midZ = (zStart + zEnd) * 0.5;
  const glassRibbon = new THREE.Mesh(new THREE.BoxGeometry(halfWidth * 2 + 0.04, winHeight, span), glassMat);
  glassRibbon.position.set(0, winY, midZ);
  group.add(glassRibbon);

  // Horizontal aluminum sash rail (typical Honduran sliding bus windows)
  const sash = new THREE.Mesh(new THREE.BoxGeometry(halfWidth * 2 + 0.06, 0.045, span), pillarMat);
  sash.position.set(0, winY - winHeight * 0.12, midZ);
  group.add(sash);

  for (let p = 0; p <= paneCount; p++) {
    const pz = THREE.MathUtils.lerp(zStart, zEnd, p / paneCount);
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(halfWidth * 2 + 0.065, winHeight + 0.06, 0.1),
      pillarMat,
    );
    pillar.position.set(0, winY, pz);
    group.add(pillar);
  }
}

export function createSchoolBusModel(textures: GameTextureSet): THREE.Group {
  // Long, realistic 9.6m Honduran "Bus Amarillo" (walkable roof at y = 2.92)
  const group = new THREE.Group();

  const yellowMat = createCarPaintMaterial(0xeab308);
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.68, metalness: 0.22 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.08, clearcoat: 1 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.2, metalness: 0.88 });
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.82 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.85,
  });
  const amberMarkerMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.65,
  });
  const stopRedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 0.65,
  });

  // Main long passenger body (z: -4.90 to +3.10 -> 8.0m body + 1.6m hood = 9.6m total!)
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.42, 2.22, 8.0), yellowMat);
  body.position.set(0, 1.66, -0.9);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Tapered classic yellow hood + engine bay (+Z front)
  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.04, 1.12, 1.58), yellowMat);
  hood.position.set(0, 1.12, 3.88);
  hood.castShadow = true;
  group.add(hood);

  const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.14, 1.48), yellowMat);
  hoodTop.position.set(0, 1.68, 3.84);
  hoodTop.rotation.x = 0.08;
  group.add(hoodTop);

  // Protective black rub-rails along both sides
  [0.86, 1.48].forEach((ry) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(2.47, 0.11, 8.02), blackMat);
    rail.position.set(0, ry, -0.9);
    group.add(rail);
  });

  // Walkable flat-crowned roof at y = 2.92 (subtle low hatches so runner runs over smoothly)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.18, 7.82), yellowMat);
  roof.position.set(0, 2.83, -0.9);
  roof.receiveShadow = true;
  roof.castShadow = true;
  group.add(roof);

  [-2.6, 0.8].forEach((hz) => {
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.06, 0.82), chromeMat);
    hatch.position.set(0, 2.93, hz);
    group.add(hatch);
  });

  // 7 Segmented passenger windows + boarding door with steps on right side (+X / -X visible)
  addSegmentedBusWindows(group, 1.21, 2.15, 0.72, -4.55, 2.75, 7, glassMat, blackMat);

  // Front boarding bi-fold door & illuminated stepwell
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.92, 0.92), blackMat);
  doorFrame.position.set(-1.22, 1.44, 2.38);
  group.add(doorFrame);
  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.22, 0.72), glassMat);
  doorGlass.position.set(-1.22, 1.68, 2.38);
  group.add(doorGlass);
  const stepPad = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.88), stepMat);
  stepPad.position.set(-1.14, 0.56, 2.38);
  group.add(stepPad);

  // Split front windshield & illuminated school marquee
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.82, 0.08), glassMat);
  windshield.position.set(0, 2.14, 3.11);
  group.add(windshield);
  const centerMullion = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.84, 0.1), blackMat);
  centerMullion.position.set(0, 2.14, 3.12);
  group.add(centerMullion);

  const signMat = new THREE.MeshStandardMaterial({
    map: textures.schoolBusSign,
    emissiveMap: textures.schoolBusSign,
    emissive: 0xffffff,
    emissiveIntensity: 0.42,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 0.34), signMat);
  sign.position.set(0, 2.72, 3.13);
  group.add(sign);

  // Top amber & red warning flashers (front & rear)
  [-0.88, -0.62, 0.62, 0.88].forEach((lx, idx) => {
    const fl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.08, 10),
      idx === 0 || idx === 3 ? stopRedMat : amberMarkerMat,
    );
    fl.rotation.x = Math.PI / 2;
    fl.position.set(lx, 2.72, 3.12);
    group.add(fl);
  });

  // STOP sign arm on driver side
  const stopSign = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 8), stopRedMat);
  stopSign.rotation.z = Math.PI / 2;
  stopSign.position.set(-1.28, 1.82, 2.65);
  group.add(stopSign);

  // Heavy steel bumpers, chrome grille & headlights
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.28, 0.24), blackMat);
  frontBumper.position.set(0, 0.52, 4.72);
  group.add(frontBumper);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.28, 0.24), blackMat);
  rearBumper.position.set(0, 0.52, -4.92);
  group.add(rearBumper);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.52, 0.08), chromeMat);
  grille.position.set(0, 1.12, 4.68);
  group.add(grille);

  [-0.78, 0.78].forEach((x) => {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12), headlightMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(x, 1.08, 4.68);
    group.add(hl);

    const tl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10), stopRedMat);
    tl.rotation.x = Math.PI / 2;
    tl.position.set(x, 1.1, -4.91);
    group.add(tl);
  });

  // Rear emergency door + mudflaps
  const rearDoor = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.65, 0.06), blackMat);
  rearDoor.position.set(0, 1.58, -4.9);
  group.add(rearDoor);
  [-1.08, 1.08].forEach((mx) => {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.05), blackMat);
    flap.position.set(mx, 0.34, -4.55);
    group.add(flap);
  });

  addBusMirrorsAndWipers(group, 1.21, 3.1, 2.08, 1.76);

  // Realistic 4-wheel heavy stance (front single, rear dual)
  [
    [-1.12, 3.55, false],
    [1.12, 3.55, false],
    [-1.08, -2.85, true],
    [1.08, -2.85, true],
  ].forEach(([wx, wz, dual]) => {
    const w = makeRealisticWheel(0.45, 0.28, Boolean(dual));
    w.position.set(Number(wx), 0.45, Number(wz));
    group.add(w);
  });

  return group;
}

export function createAutobusModel(textures: GameTextureSet, variantIndex = 0): THREE.Group {
  // Long, realistic 10.0m Honduran urban transit bus (walkable roof at y = 2.98)
  const group = new THREE.Group();

  const palettes = [
    { body: 0x991b1b, stripe: 0xd97706, roof: 0xe2e8f0 },
    { body: 0x0369a1, stripe: 0xeab308, roof: 0xf1f5f9 },
    { body: 0x166534, stripe: 0xf59e0b, roof: 0xe2e8f0 },
  ];
  const pal = palettes[variantIndex % palettes.length];

  const bodyMat = createCarPaintMaterial(pal.body);
  const stripeMat = new THREE.MeshStandardMaterial({ color: pal.stripe, roughness: 0.35, metalness: 0.25 });
  const roofMat = new THREE.MeshStandardMaterial({ color: pal.roof, roughness: 0.52, metalness: 0.14 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.72 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.08, clearcoat: 1 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.18, metalness: 0.9 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.85,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 0.75,
  });

  // Lower reinforced body & cargo/mechanical bay doors (10.0m length: z -5.0 to +5.0)
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.44, 1.18, 9.96), bodyMat);
  chassis.position.y = 1.02;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.24, 9.98), stripeMat);
  stripe.position.y = 1.24;
  group.add(stripe);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.38, 1.24, 9.75), roofMat);
  cabin.position.y = 2.18;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  group.add(cabin);

  // Flat-topped walkable roof at y = 2.98
  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.2, 9.45), roofMat);
  roofCap.position.y = 2.88;
  roofCap.receiveShadow = true;
  roofCap.castShadow = true;
  group.add(roofCap);

  // Rear low-profile AC condenser + front vent hatch (keeps center walkway clean)
  const acUnit = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.2, 1.5), chromeMat);
  acUnit.position.set(0, 3.06, -3.55);
  group.add(acUnit);
  const frontHatch = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.06, 0.85), chromeMat);
  frontHatch.position.set(0, 3.0, 2.2);
  group.add(frontHatch);

  // Panoramic front windshield + 8-pane side windows
  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.94, 0.08), glassMat);
  frontGlass.position.set(0, 2.14, 4.9);
  group.add(frontGlass);

  addSegmentedBusWindows(group, 1.19, 2.18, 0.8, -4.45, 3.35, 8, glassMat, darkMat);

  // Front passenger boarding door + rear exit door with step recesses
  [3.95, -3.15].forEach((dz) => {
    const dFrame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.98, 0.94), darkMat);
    dFrame.position.set(-1.22, 1.46, dz);
    group.add(dFrame);
    const dPane = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.38, 0.72), glassMat);
    dPane.position.set(-1.22, 1.7, dz);
    group.add(dPane);
  });

  // Destination LED Board
  const signTex = textures.busSigns[variantIndex % textures.busSigns.length];
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissiveMap: signTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.48,
  });
  const signBoard = new THREE.Mesh(new THREE.PlaneGeometry(1.68, 0.34), signMat);
  signBoard.position.set(0, 2.72, 4.92);
  group.add(signBoard);

  // Chrome & rubber bumpers, grille, headlights, taillights & mudflaps
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.28, 0.24), chromeMat);
  frontBumper.position.set(0, 0.5, 4.98);
  group.add(frontBumper);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.28, 0.24), darkMat);
  rearBumper.position.set(0, 0.5, -5.0);
  group.add(rearBumper);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.42, 0.08), chromeMat);
  grille.position.set(0, 0.96, 4.99);
  group.add(grille);

  [-0.86, 0.86].forEach((x) => {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12), headlightMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(x, 0.95, 4.99);
    group.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.08), taillightMat);
    tl.position.set(x, 1.05, -5.0);
    group.add(tl);

    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.05), darkMat);
    flap.position.set(x * 1.25, 0.34, -4.65);
    group.add(flap);
  });

  addBusMirrorsAndWipers(group, 1.19, 4.9, 2.12, 1.72);

  [
    [-1.12, 3.35, false],
    [1.12, 3.35, false],
    [-1.08, -2.95, true],
    [1.08, -2.95, true],
  ].forEach(([wx, wz, dual]) => {
    const w = makeRealisticWheel(0.46, 0.28, Boolean(dual));
    w.position.set(Number(wx), 0.46, Number(wz));
    group.add(w);
  });

  return group;
}

export function createDecoratedBusModel(textures: GameTextureSet): THREE.Group {
  // Long, realistic 10.4m "Expreso Catracho" Intercity Coach (walkable roof at y = 3.02)
  const group = new THREE.Group();

  const bodyMat = createCarPaintMaterial(0x7c2d12);
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.28, metalness: 0.45 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.46, metalness: 0.18 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.65 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x090d16, roughness: 0.06, clearcoat: 1 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.92 });
  const muralMat = new THREE.MeshStandardMaterial({
    map: textures.decoratedBusMural,
    roughness: 0.35,
    metalness: 0.2,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 0.9,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 0.78,
  });

  // 10.4m chassis (z: -5.2 to +5.2)
  const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(2.46, 1.24, 10.35), bodyMat);
  lowerHull.position.y = 1.06;
  lowerHull.castShadow = true;
  lowerHull.receiveShadow = true;
  group.add(lowerHull);

  const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.24, 10.15), roofMat);
  upperDeck.position.y = 2.24;
  upperDeck.castShadow = true;
  upperDeck.receiveShadow = true;
  group.add(upperDeck);

  // Walkable flat coach roof at y = 3.02
  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.2, 9.85), roofMat);
  roofCap.position.y = 2.92;
  roofCap.receiveShadow = true;
  group.add(roofCap);

  // Decorative side Expreso murals & chrome luggage bay moldings
  [-1.24, 1.24].forEach((sx) => {
    const mural = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 0.92), muralMat);
    mural.position.set(sx, 1.12, -0.1);
    mural.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(mural);
  });

  // Outer perimeter chrome luggage rails on roof (leaving center walkable!)
  [-0.96, 0.96].forEach((rx) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 7.6), chromeMat);
    rail.position.set(rx, 3.1, -0.4);
    group.add(rail);
  });

  // Front panoramic windshield + 9-pane tinted windows
  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(2.16, 1.0, 0.08), glassMat);
  frontGlass.position.set(0, 2.2, 5.1);
  group.add(frontGlass);

  addSegmentedBusWindows(group, 1.2, 2.24, 0.84, -4.7, 3.6, 9, glassMat, darkMat);

  // Front chrome visor + destination board
  const visor = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.14, 0.32), goldMat);
  visor.position.set(0, 2.86, 5.14);
  group.add(visor);

  const signMat = new THREE.MeshStandardMaterial({
    map: textures.busSigns[0],
    emissiveMap: textures.busSigns[0],
    emissive: 0xffffff,
    emissiveIntensity: 0.45,
  });
  const signBoard = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 0.34), signMat);
  signBoard.position.set(0, 2.7, 5.12);
  group.add(signBoard);

  // Bumpers, grille, headlights & twin chrome exhaust stacks
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.28, 0.24), chromeMat);
  frontBumper.position.set(0, 0.5, 5.18);
  group.add(frontBumper);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.46, 0.08), chromeMat);
  grille.position.set(0, 0.98, 5.19);
  group.add(grille);

  [-0.86, 0.86].forEach((x) => {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12), headlightMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(x, 0.96, 5.19);
    group.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.08), taillightMat);
    tl.position.set(x, 1.08, -5.2);
    group.add(tl);
  });

  [-0.98, 0.98].forEach((ex) => {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 2.2, 10), chromeMat);
    stack.position.set(ex, 2.2, -5.16);
    group.add(stack);
  });

  addBusMirrorsAndWipers(group, 1.2, 5.1, 2.18, 1.74);

  // Heavy 3-axle intercity coach wheels (front + twin rear axles)
  [
    [-1.12, 3.65, false],
    [1.12, 3.65, false],
    [-1.08, -2.55, true],
    [1.08, -2.55, true],
    [-1.08, -3.75, true],
    [1.08, -3.75, true],
  ].forEach(([wx, wz, dual]) => {
    const w = makeRealisticWheel(0.46, 0.28, Boolean(dual));
    w.position.set(Number(wx), 0.46, Number(wz));
    group.add(w);
  });

  return group;
}

export function createMototaxiModel(): THREE.Group {
  const group = new THREE.Group();

  // Explicitly Mototaxi ROJA con techo BEIGE as specified
  const bodyMat = createCarPaintMaterial(0xb91c1c);
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0xe5d3b3, roughness: 0.82, metalness: 0.03 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.35, metalness: 0.72 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x94a3b8,
    roughness: 0.08,
    transparent: true,
    opacity: 0.55,
    clearcoat: 1,
  });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.85,
  });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 2.2), frameMat);
  floor.position.set(0, 0.32, 0);
  floor.castShadow = true;
  group.add(floor);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.74, 0.56), bodyMat);
  nose.position.set(0, 0.68, 0.96);
  nose.rotation.x = -0.18;
  nose.castShadow = true;
  group.add(nose);

  const fender = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.52), bodyMat);
  fender.position.set(0, 0.45, 1.06);
  group.add(fender);

  const headlight = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 14), headlightMat);
  headlight.rotation.x = Math.PI / 2;
  headlight.position.set(0, 0.72, 1.24);
  group.add(headlight);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.52, 0.06), glassMat);
  windshield.position.set(0, 1.25, 0.78);
  windshield.rotation.x = -0.28;
  group.add(windshield);

  const rearBack = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.76, 0.14), bodyMat);
  rearBack.position.set(0, 0.72, -1.04);
  rearBack.castShadow = true;
  group.add(rearBack);

  [-0.74, 0.74].forEach((x) => {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.64, 1.28), bodyMat);
    side.position.set(x, 0.66, -0.42);
    side.castShadow = true;
    group.add(side);
  });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.22, 0.65), seatMat);
  seat.position.set(0, 0.54, -0.55);
  group.add(seat);

  [
    [-0.5, 0.74],
    [0.5, 0.74],
    [-0.72, -1.0],
    [0.72, -1.0],
  ].forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.96, 8), frameMat);
    pillar.position.set(px, 1.26, pz);
    group.add(pillar);
  });

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.18, 2.1), canopyMat);
  roof.position.set(0, 1.72, -0.12);
  roof.castShadow = true;
  group.add(roof);

  const frontWheel = makeRealisticWheel(0.28, 0.2);
  frontWheel.position.set(0, 0.28, 1.05);
  group.add(frontWheel);

  [-0.78, 0.78].forEach((wx) => {
    const rw = makeRealisticWheel(0.28, 0.22);
    rw.position.set(wx, 0.28, -0.78);
    group.add(rw);
  });

  return group;
}

export function createLowBarrierModel(): THREE.Group {
  const group = new THREE.Group();

  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.45, metalness: 0.1 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.75, metalness: 0.2 });

  [-0.85, 0.85].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.85, 0.5), darkMat);
    leg.position.set(x, 0.425, 0);
    leg.castShadow = true;
    group.add(leg);
  });

  const plank = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.34, 0.12), orangeMat);
  plank.position.set(0, 0.68, 0);
  plank.castShadow = true;
  group.add(plank);

  [-0.65, 0, 0.65].forEach((x) => {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.35, 0.14), whiteMat);
    stripe.position.set(x, 0.68, 0);
    group.add(stripe);
  });

  [-1.02, 1.02].forEach((cx) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.36), darkMat);
    base.position.set(cx, 0.03, 0.26);
    group.add(base);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.54, 14), orangeMat);
    cone.position.set(cx, 0.32, 0.26);
    cone.castShadow = true;
    group.add(cone);

    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.115, 0.12, 14), whiteMat);
    ring.position.set(cx, 0.34, 0.26);
    group.add(ring);
  });

  return group;
}

export function createOverheadArchModel(textures: GameTextureSet): THREE.Group {
  const group = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.32, metalness: 0.82 });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.5, metalness: 0.2 });
  const bannerMat = new THREE.MeshStandardMaterial({
    map: textures.archBannerTexture,
    roughness: 0.45,
    metalness: 0.1,
  });

  [-1.22, 1.22].forEach((x) => {
    const footing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.42), baseMat);
    footing.position.set(x, 0.11, 0);
    footing.castShadow = true;
    group.add(footing);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.55, 12), steelMat);
    post.position.set(x, 1.3, 0);
    post.castShadow = true;
    group.add(post);
  });

  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.08, 0.24), bannerMat);
  beam.position.set(0, 1.88, 0);
  beam.castShadow = true;
  group.add(beam);

  return group;
}

export function createFiveCentCoinModel(textures: GameTextureSet): THREE.Group {
  const group = new THREE.Group();

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.15,
    metalness: 0.94,
  });
  const faceMat = new THREE.MeshStandardMaterial({
    map: textures.coinFaceTexture,
    roughness: 0.2,
    metalness: 0.86,
  });

  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 0.08, 28),
    [rimMat, faceMat, faceMat],
  );
  core.rotation.x = Math.PI / 2;
  core.castShadow = true;
  group.add(core);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 12, 28), rimMat);
  group.add(rim);

  return group;
}

export function createGuacamayaModel(): GuacamayaRig {
  const root = new THREE.Group();
  const redMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.55 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.5 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.4 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.42, 6, 12), redMat);
  body.rotation.x = Math.PI / 2;
  root.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), redMat);
  head.position.set(0, 0.08, -0.34);
  root.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 8), beakMat);
  beak.rotation.x = -Math.PI / 2;
  beak.position.set(0, 0.05, -0.52);
  root.add(beak);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.85, 6), blueMat);
  tail.rotation.x = Math.PI / 2;
  tail.position.set(0, 0.02, 0.64);
  root.add(tail);

  const makeWing = (side: -1 | 1): THREE.Group => {
    const p = new THREE.Group();
    p.position.set(side * 0.15, 0.06, -0.05);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 0.32), yellowMat);
    inner.position.x = side * 0.22;
    p.add(inner);
    const outer = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.035, 0.26), blueMat);
    outer.position.x = side * 0.55;
    p.add(outer);
    return p;
  };

  const leftWingPivot = makeWing(-1);
  const rightWingPivot = makeWing(1);
  root.add(leftWingPivot);
  root.add(rightWingPivot);

  return { root, leftWingPivot, rightWingPivot };
}

export function createCopanStelaModel(textures: GameTextureSet): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    map: textures.copanStoneTexture,
    roughness: 0.92,
    metalness: 0.04,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 1.5), stoneMat);
  base.position.y = 0.225;
  base.castShadow = true;
  group.add(base);

  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.75, 0.72), stoneMat);
  pillar.position.y = 1.82;
  pillar.castShadow = true;
  group.add(pillar);

  const crown = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.42, 0.84), stoneMat);
  crown.position.y = 3.35;
  group.add(crown);

  return group;
}

/**
 * Crea un tendedero de ropa auténtico de barrio hondureño con camisas, pantalones,
 * toallas y sábanas colgadas que se mecen suavemente con el viento.
 */
function createBarrioClothesline(seed: number, span = 4.2): THREE.Group {
  const g = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.65, metalness: 0.45 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.85 });

  [-span * 0.5, span * 0.5].forEach((pz) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 1.95, 6), postMat);
    post.position.set(0, 0.975, pz);
    post.castShadow = true;
    g.add(post);
  });

  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 1.85, -span * 0.5),
    new THREE.Vector3(0, 1.7, 0),
    new THREE.Vector3(0, 1.85, span * 0.5),
  );
  const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.012, 4, false), ropeMat);
  g.add(rope);

  const laundryColors = [0xf1f5f9, 0x3b82f6, 0xbe123c, 0xfacc15, 0x0f766e, 0xf8fafc, 0x475569];
  const itemCount = 5 + (seed % 2);

  for (let i = 0; i < itemCount; i++) {
    const t = (i + 0.7) / (itemCount + 0.4);
    const pt = curve.getPoint(t);
    const kind = (seed + i) % 4; // 0: camisa, 1: pantalón, 2: toalla, 3: sábana
    const fabricMat = new THREE.MeshStandardMaterial({
      color: laundryColors[(seed * 3 + i) % laundryColors.length],
      roughness: 0.9,
      side: THREE.DoubleSide,
    });

    const clothPivot = new THREE.Group();
    clothPivot.position.set(pt.x, pt.y, pt.z);
    clothPivot.userData.laundryPhase = seed * 1.37 + i * 0.92;

    if (kind === 0) {
      // Camisa con mangas
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.54, 0.42), fabricMat);
      torso.position.y = -0.28;
      clothPivot.add(torso);
      [-0.26, 0.26].forEach((sz, idx) => {
        const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.16), fabricMat);
        sleeve.position.set(0, -0.14, sz);
        sleeve.rotation.x = idx === 0 ? 0.35 : -0.35;
        clothPivot.add(sleeve);
      });
    } else if (kind === 1) {
      // Pantalón denim / tela
      const denimMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x1e3a8a : 0x57534e,
        roughness: 0.88,
      });
      const waist = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.18, 0.36), denimMat);
      waist.position.y = -0.1;
      clothPivot.add(waist);
      [-0.1, 0.1].forEach((lz) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.52, 0.14), denimMat);
        leg.position.set(0, -0.42, lz);
        clothPivot.add(leg);
      });
    } else if (kind === 2) {
      // Toalla de baño
      const towel = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.62, 0.36), fabricMat);
      towel.position.y = -0.32;
      clothPivot.add(towel);
    } else {
      // Sábana grande
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.92, 0.68), fabricMat);
      sheet.position.y = -0.47;
      clothPivot.add(sheet);
    }

    g.add(clothPivot);
  }

  return g;
}

/**
 * Construye una casa o comercio auténtico de barrio hondureño con variedad real:
 * bloque, ladrillo, repello pintado desgastado, portones metálicos, barrotes,
 * balcones, techos de zinc/teja, pulperías y tendederos.
 */
function buildHonduranBarrioLot(
  textures: GameTextureSet,
  city: CityCatalogItem,
  side: -1 | 1,
  lotSeed: number,
  lotDepth: number,
): THREE.Group {
  const lot = new THREE.Group();
  const faceDir = -side; // Hacia la calle (+X si side=-1, -X si side=1)
  const typology = lotSeed % 5;

  const stuccoColors = [0xd6d3d1, 0xe7d3b4, 0xbcd3d9, 0xd9a79c, 0xc7d1bd, 0xe2c799, 0xcbd5e1];
  const wallTint = stuccoColors[(lotSeed * 5) % stuccoColors.length];

  const cinderMat = new THREE.MeshStandardMaterial({
    map: textures.cinderblockTexture,
    roughness: 0.92,
    metalness: 0.03,
  });
  const brickMat = new THREE.MeshStandardMaterial({
    map: textures.brickWallTexture,
    roughness: 0.88,
    metalness: 0.03,
  });
  const stuccoMat = new THREE.MeshStandardMaterial({
    map: textures.barrioStuccoTexture,
    color: wallTint,
    roughness: 0.86,
    metalness: 0.04,
  });
  const zincMat = new THREE.MeshStandardMaterial({
    map: textures.zincRoofTexture,
    roughness: 0.56,
    metalness: 0.42,
  });
  const tejaMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d12,
    roughness: 0.84,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.52,
    metalness: 0.72,
  });
  const gateColors = [0x1e3a3a, 0x3f2e21, 0x1e293b, 0x7f1d1d];
  const gateMat = new THREE.MeshStandardMaterial({
    color: gateColors[lotSeed % gateColors.length],
    roughness: 0.48,
    metalness: 0.65,
  });
  const windowGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.12,
    clearcoat: 0.85,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.82 });

  const addBarredWindow = (
    parent: THREE.Group,
    wx: number,
    wy: number,
    wz: number,
    wWidth: number,
    wHeight: number,
  ) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.14, wHeight + 0.14, wWidth + 0.14), trimMat);
    frame.position.set(wx, wy, wz);
    parent.add(frame);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.17, wHeight, wWidth), windowGlassMat);
    glass.position.set(wx, wy, wz);
    parent.add(glass);

    // Ventana con barrotes metálicos (rejas de seguridad)
    const barCount = Math.max(3, Math.round(wWidth / 0.28));
    for (let b = 0; b < barCount; b++) {
      const bz = wz + THREE.MathUtils.lerp(-wWidth * 0.4, wWidth * 0.4, b / (barCount - 1));
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, wHeight, 6), ironMat);
      bar.position.set(wx + faceDir * 0.1, wy, bz);
      parent.add(bar);
    }
    const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, wWidth + 0.04), ironMat);
    crossBar.position.set(wx + faceDir * 0.1, wy, wz);
    parent.add(crossBar);
  };

  if (typology === 0) {
    // Casa de 1 planta de bloque/repello con muro frontal, portón metálico y tendedero en patio/corredor
    const h = 3.5;
    const w = 5.0;
    const d = lotDepth * 0.86;
    const houseX = side * 10.6;

    const house = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lotSeed % 2 === 0 ? stuccoMat : cinderMat);
    house.position.set(houseX, h * 0.5, 0);
    house.castShadow = true;
    house.receiveShadow = true;
    lot.add(house);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.75, 0.12, d + 0.45), zincMat);
    roof.position.set(houseX + faceDir * 0.25, h + 0.1, 0);
    roof.rotation.z = -faceDir * 0.14;
    roof.castShadow = true;
    lot.add(roof);

    // Muro perimetral de bloque con portón metálico hacia la acera
    const wallX = side * 6.85;
    const muroLeft = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.05, d * 0.34), cinderMat);
    muroLeft.position.set(wallX, 1.025, -d * 0.32);
    muroLeft.castShadow = true;
    lot.add(muroLeft);

    const muroRight = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.05, d * 0.32), stuccoMat);
    muroRight.position.set(wallX, 1.025, d * 0.33);
    muroRight.castShadow = true;
    lot.add(muroRight);

    const porton = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.15, d * 0.32), gateMat);
    porton.position.set(wallX, 1.075, 0);
    porton.castShadow = true;
    lot.add(porton);

    // Franjas/costillas del portón metálico
    for (let r = -3; r <= 3; r++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.98, 0.04), ironMat);
      rib.position.set(wallX, 1.08, r * 0.35);
      lot.add(rib);
    }

    addBarredWindow(lot, houseX + faceDir * (w * 0.5), 1.95, -1.6, 1.15, 0.95);
    addBarredWindow(lot, houseX + faceDir * (w * 0.5), 1.95, 1.6, 1.15, 0.95);

    // Tendedero visible en el patio/corredor frontal entre muro y casa
    const clothesline = createBarrioClothesline(lotSeed, 4.4);
    clothesline.position.set(side * 7.65, 0, -0.4);
    lot.add(clothesline);
  } else if (typology === 1) {
    // Pulpería / Comedor / Taller de barrio abajo + apartamento familiar arriba con balcón
    const w = 5.4;
    const d = lotDepth * 0.92;
    const h = 6.35;
    const bx = side * 9.85;

    const lowerShop = new THREE.Mesh(new THREE.BoxGeometry(w, 3.1, d), stuccoMat);
    lowerShop.position.set(bx, 1.55, 0);
    lowerShop.castShadow = true;
    lowerShop.receiveShadow = true;
    lot.add(lowerShop);

    const upperApt = new THREE.Mesh(new THREE.BoxGeometry(w, 3.25, d * 0.94), lotSeed % 2 === 0 ? brickMat : cinderMat);
    upperApt.position.set(bx, 4.72, 0);
    upperApt.castShadow = true;
    upperApt.receiveShadow = true;
    lot.add(upperApt);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.65, 0.14, d), zincMat);
    roof.position.set(bx + faceDir * 0.2, h + 0.08, 0);
    roof.rotation.z = -faceDir * 0.11;
    lot.add(roof);

    // Balcón frontal del segundo piso con barandal metálico
    const balconyDeck = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, d * 0.72), trimMat);
    balconyDeck.position.set(bx + faceDir * (w * 0.5 + 0.45), 3.15, 0);
    lot.add(balconyDeck);
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, d * 0.72), ironMat);
    railTop.position.set(bx + faceDir * (w * 0.5 + 0.88), 4.05, 0);
    lot.add(railTop);
    for (let b = -4; b <= 4; b++) {
      const baluster = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.9, 6), ironMat);
      baluster.position.set(bx + faceDir * (w * 0.5 + 0.88), 3.6, b * (d * 0.075));
      lot.add(baluster);
    }

    // Ventanas con barrotes y puerta metálica enrollable de pulpería
    const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.15, 2.35), gateMat);
    shutter.position.set(bx + faceDir * (w * 0.5), 1.15, -1.1);
    lot.add(shutter);

    addBarredWindow(lot, bx + faceDir * (w * 0.5), 1.75, 1.85, 1.3, 1.0);
    addBarredWindow(lot, bx + faceDir * (w * 0.5), 4.55, -1.6, 1.25, 1.05);
    addBarredWindow(lot, bx + faceDir * (w * 0.5), 4.55, 1.6, 1.25, 1.05);

    // Alero de zinc y rótulo de pulpería/comedor
    const awning = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.1, d * 0.78), zincMat);
    awning.position.set(bx + faceDir * (w * 0.5 + 0.56), 2.75, 0);
    awning.rotation.z = -faceDir * 0.24;
    lot.add(awning);

    const shopTex = textures.shopSigns[lotSeed % textures.shopSigns.length];
    const shopSign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 0.92),
      new THREE.MeshStandardMaterial({ map: shopTex, roughness: 0.55 }),
    );
    shopSign.position.set(bx + faceDir * (w * 0.5 + 0.1), 3.12, 0);
    shopSign.rotation.y = faceDir > 0 ? Math.PI / 2 : -Math.PI / 2;
    lot.add(shopSign);

    // Hielera / refresquera roja o azul fuera de la pulpería
    const cooler = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 1.18, 0.72),
      new THREE.MeshStandardMaterial({ color: lotSeed % 2 === 0 ? 0xb91c1c : 0x1d4ed8, roughness: 0.42 }),
    );
    cooler.position.set(bx + faceDir * (w * 0.5 + 0.42), 0.59, 2.1);
    cooler.castShadow = true;
    lot.add(cooler);
  } else if (typology === 2) {
    // Casa de 2 plantas de ladrillo o cemento con techo de teja, balcón lateral y ropa colgada en terraza
    const w = 5.2;
    const d = lotDepth * 0.88;
    const h = 6.2;
    const bx = side * 10.1;

    const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lotSeed % 3 === 0 ? brickMat : stuccoMat);
    walls.position.set(bx, h * 0.5, 0);
    walls.castShadow = true;
    walls.receiveShadow = true;
    lot.add(walls);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(w * 0.8, 1.75, 4),
      city.id === 'comayagua' || lotSeed % 2 === 0 ? tejaMat : zincMat,
    );
    roof.position.set(bx, h + 0.85, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1, 1, d / w);
    lot.add(roof);

    // Tinaco negro de agua potable en losa trasera
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.48, 1.05, 12),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55 }),
    );
    tank.position.set(bx - faceDir * 1.4, h + 0.52, 2.2);
    lot.add(tank);

    // Balcón en segundo piso + tendedero con ropa colgada
    const balcony = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.16, d * 0.76), trimMat);
    balcony.position.set(bx + faceDir * (w * 0.5 + 0.52), 3.1, 0);
    lot.add(balcony);

    const clothesline = createBarrioClothesline(lotSeed + 2, 4.2);
    clothesline.position.set(bx + faceDir * (w * 0.5 + 0.82), 3.16, 0);
    lot.add(clothesline);

    const porton = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.25, 2.15), gateMat);
    porton.position.set(bx + faceDir * (w * 0.5), 1.125, -1.35);
    lot.add(porton);

    addBarredWindow(lot, bx + faceDir * (w * 0.5), 1.75, 1.65, 1.2, 0.95);
    addBarredWindow(lot, bx + faceDir * (w * 0.5), 4.45, -1.45, 1.2, 1.0);
    addBarredWindow(lot, bx + faceDir * (w * 0.5), 4.45, 1.55, 1.2, 1.0);
  } else if (typology === 3) {
    // Casa humilde de bloque sin repello arriba + ladrillo abajo, muro bajo, ropa al aire libre
    const w = 4.9;
    const d = lotDepth * 0.82;
    const h = 3.8;
    const bx = side * 10.35;

    const lowerWall = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, d), brickMat);
    lowerWall.position.set(bx, 0.75, 0);
    lowerWall.castShadow = true;
    lowerWall.receiveShadow = true;
    lot.add(lowerWall);

    const upperWall = new THREE.Mesh(new THREE.BoxGeometry(w, h - 1.5, d), cinderMat);
    upperWall.position.set(bx, 1.5 + (h - 1.5) * 0.5, 0);
    upperWall.castShadow = true;
    lot.add(upperWall);

    // Losa con varillas de hierro expuestas en las esquinas (construcción típica hondureña)
    const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, 0.16, d + 0.35), trimMat);
    roofSlab.position.set(bx, h + 0.08, 0);
    lot.add(roofSlab);

    [-d * 0.44, d * 0.44].forEach((rz) => {
      const rebar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 6), ironMat);
      rebar.position.set(bx + faceDir * (w * 0.44), h + 0.45, rz);
      lot.add(rebar);
    });

    // Muro bajo frontal con reja y portón peatonal
    const lowMuro = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.15, d * 0.96), cinderMat);
    lowMuro.position.set(side * 6.95, 0.575, 0);
    lowMuro.castShadow = true;
    lot.add(lowMuro);

    for (let z = -d * 0.42; z <= d * 0.42; z += 0.42) {
      const picket = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.75, 5), ironMat);
      picket.position.set(side * 6.95, 1.52, z);
      lot.add(picket);
    }

    addBarredWindow(lot, bx + faceDir * (w * 0.5), 2.15, -1.25, 1.15, 0.95);
    addBarredWindow(lot, bx + faceDir * (w * 0.5), 2.15, 1.35, 1.15, 0.95);

    const clothesline = createBarrioClothesline(lotSeed + 5, 4.4);
    clothesline.position.set(side * 7.48, 0, 0.25);
    lot.add(clothesline);
  } else {
    // Casa mixta de cemento pintado + pequeña tienda/taller vecinal contiguo
    const w = 5.3;
    const d = lotDepth * 0.9;
    const h = 4.65;
    const bx = side * 9.95;

    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stuccoMat);
    mainBody.position.set(bx, h * 0.5, 0);
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    lot.add(mainBody);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.55, 0.14, d + 0.2), zincMat);
    roof.position.set(bx + faceDir * 0.18, h + 0.08, 0);
    roof.rotation.z = -faceDir * 0.12;
    lot.add(roof);

    // Portón vehicular metálico + puerta de entrada + rótulo pequeño
    const bigGate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.45, 2.7), gateMat);
    bigGate.position.set(bx + faceDir * (w * 0.5), 1.225, -1.65);
    lot.add(bigGate);

    const awning = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.09, d * 0.52), zincMat);
    awning.position.set(bx + faceDir * (w * 0.5 + 0.5), 2.72, 1.35);
    awning.rotation.z = -faceDir * 0.2;
    lot.add(awning);

    const shopTex = textures.shopSigns[(lotSeed + 2) % textures.shopSigns.length];
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.78),
      new THREE.MeshStandardMaterial({ map: shopTex, roughness: 0.55 }),
    );
    sign.position.set(bx + faceDir * (w * 0.5 + 0.08), 3.35, 1.35);
    sign.rotation.y = faceDir > 0 ? Math.PI / 2 : -Math.PI / 2;
    lot.add(sign);

    addBarredWindow(lot, bx + faceDir * (w * 0.5), 1.85, 1.55, 1.25, 1.0);
    addBarredWindow(lot, bx + faceDir * (w * 0.5), 3.65, -1.45, 1.2, 0.9);
  }

  return lot;
}

/**
 * Crea un poste de tendido eléctrico concreto (ENEE) con lámpara, cruceta, aisladores,
 * transformador opcional y cables catenarios a lo largo del segmento de calle.
 */
function addUtilityPoleAndCables(
  seg: THREE.Group,
  side: -1 | 1,
  segmentLength: number,
  hasTransformer: boolean,
  hasStreetLamp: boolean,
): void {
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.72 });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.68, metalness: 0.25 });
  const ceramicMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.35 });

  const px = side * 5.65;
  const pz = -segmentLength * 0.5;
  const poleHeight = 7.8;

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, poleHeight, 8), concreteMat);
  pole.position.set(px, poleHeight * 0.5 + 0.15, pz);
  pole.castShadow = true;
  seg.add(pole);

  // Cruceta metálica superior para cables de media tensión
  const crossArm = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.1, 0.12), steelMat);
  crossArm.position.set(px, 7.35, pz);
  seg.add(crossArm);

  [-0.72, 0, 0.72].forEach((ox) => {
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.14, 6), ceramicMat);
    ins.position.set(px + ox, 7.45, pz);
    seg.add(ins);

    // Cable catenario que conecta hasta el siguiente poste en z = +segmentLength/2
    const sagCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(px + ox, 7.48, -segmentLength * 0.5),
      new THREE.Vector3(px + ox, 6.92, 0),
      new THREE.Vector3(px + ox, 7.48, segmentLength * 0.5),
    );
    const wire = new THREE.Mesh(new THREE.TubeGeometry(sagCurve, 10, 0.018, 4, false), cableMat);
    seg.add(wire);
  });

  // Cable secundario inferior + acometida hacia las casas
  const dropCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(px, 6.35, -segmentLength * 0.5),
    new THREE.Vector3(px + side * 1.4, 5.15, -segmentLength * 0.22),
    new THREE.Vector3(px + side * 3.1, 4.1, -segmentLength * 0.08),
  );
  const serviceDrop = new THREE.Mesh(new THREE.TubeGeometry(dropCurve, 8, 0.014, 4, false), cableMat);
  seg.add(serviceDrop);

  if (hasTransformer) {
    const transMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.48, metalness: 0.62 });
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.72, 10), transMat);
    tank.position.set(px - side * 0.28, 5.7, pz);
    tank.castShadow = true;
    seg.add(tank);
  }

  if (hasStreetLamp) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 0.08), steelMat);
    arm.position.set(px - side * 0.65, 6.18, pz);
    seg.add(arm);

    const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.22), steelMat);
    lampHead.position.set(px - side * 1.25, 6.16, pz);
    seg.add(lampHead);

    const lampGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: 0xfbbf24,
        emissiveIntensity: 0.9,
      }),
    );
    lampGlow.position.set(px - side * 1.25, 6.08, pz);
    seg.add(lampGlow);
  }
}

export function createHonduranCitySegment(
  textures: GameTextureSet,
  city: CityCatalogItem,
  segmentLength: number,
  segIndex: number,
): THREE.Group {
  const seg = new THREE.Group();

  // Realistic weathered asphalt with roughness map
  const roadMat = new THREE.MeshStandardMaterial({
    map: textures.roadTexture,
    roughnessMap: textures.roadRoughnessTexture,
    roughness: 0.85,
    metalness: 0.06,
  });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(10.4, segmentLength), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  seg.add(road);

  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: textures.sidewalkTexture,
    roughness: 0.88,
    metalness: 0.03,
  });
  const curbMat = new THREE.MeshStandardMaterial({
    color: 0xa8a29e,
    roughness: 0.82,
    metalness: 0.04,
  });

  [-1, 1].forEach((sideVal) => {
    const side = sideVal as -1 | 1;
    const sw = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.2, segmentLength), sidewalkMat);
    sw.position.set(side * 8.6, 0.1, 0);
    sw.receiveShadow = true;
    seg.add(sw);

    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, segmentLength), curbMat);
    curb.position.set(side * 5.36, 0.12, 0);
    seg.add(curb);

    // Coastal ocean (La Ceiba / Roatán) OR tropical green valley terrain
    if (city.hasOcean && side === 1) {
      const sand = new THREE.Mesh(
        new THREE.PlaneGeometry(14, segmentLength),
        new THREE.MeshStandardMaterial({ color: 0xd6b88d, roughness: 0.92 }),
      );
      sand.rotation.x = -Math.PI / 2;
      sand.position.set(19, -0.02, 0);
      seg.add(sand);

      const sea = new THREE.Mesh(
        new THREE.PlaneGeometry(65, segmentLength),
        new THREE.MeshPhysicalMaterial({
          map: textures.oceanWaterTexture,
          color: 0xffffff,
          roughness: 0.14,
          metalness: 0.12,
          clearcoat: 0.85,
        }),
      );
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(58, -0.06, 0);
      seg.add(sea);
    } else {
      const groundMat = new THREE.MeshStandardMaterial({
        color: city.groundHex,
        roughness: 0.94,
      });
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, segmentLength), groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(side * 42, -0.02, 0);
      seg.add(ground);
    }
  });

  // Casas auténticas de barrios hondureños, pulperías, tendederos y postes con cables en ambos lados
  [-1, 1].forEach((sideVal, sideIdx) => {
    const side = sideVal as -1 | 1;

    // Postes de electricidad + cables a lo largo de la acera (siempre conectan cada 24m)
    addUtilityPoleAndCables(
      seg,
      side,
      segmentLength,
      (segIndex + sideIdx) % 3 === 0,
      (segIndex + sideIdx) % 2 === 0,
    );

    if (city.hasOcean && side === 1 && segIndex % 2 === 0) {
      // Open coastal malecón vista: seawall, warm bollards & low stone rail framing ocean/pier/lighthouse
      const seawall = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.72, segmentLength),
        curbMat,
      );
      seawall.position.set(11.75, 0.45, 0);
      seawall.receiveShadow = true;
      seg.add(seawall);

      for (let pz = -segmentLength * 0.35; pz <= segmentLength * 0.36; pz += segmentLength * 0.35) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 1.15, 8), curbMat);
        post.position.set(11.75, 0.65, pz);
        seg.add(post);

        const lantern = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 8, 8),
          new THREE.MeshStandardMaterial({
            color: 0xfef3c7,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.85,
          }),
        );
        lantern.position.set(11.75, 1.28, pz);
        seg.add(lantern);
      }
      return;
    }
    if (!city.hasOcean && segIndex % 2 === 1 && side === 1) {
      // Open scenic urban plaza vista framing procedural city landmarks (Catedral, Estadio, etc.)
      const lawn = new THREE.Mesh(
        new THREE.PlaneGeometry(10, segmentLength),
        new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.92 }),
      );
      lawn.rotation.x = -Math.PI / 2;
      lawn.position.set(17, 0.04, 0);
      lawn.receiveShadow = true;
      seg.add(lawn);

      const lowWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.62, segmentLength * 0.88),
        curbMat,
      );
      lowWall.position.set(11.8, 0.41, 0);
      lowWall.castShadow = true;
      seg.add(lowWall);

      const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x1e4620, roughness: 0.88 });
      const hedge = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.55, segmentLength * 0.82),
        hedgeMat,
      );
      hedge.position.set(12.5, 0.32, 0);
      seg.add(hedge);
      return;
    }

    // Dos solares/casas distintas por segmento en cada acera -> sensación orgánica y habitada
    const lotDepth = segmentLength * 0.44;
    [-segmentLength * 0.25, segmentLength * 0.25].forEach((lotZ, lotIdx) => {
      const lotSeed = segIndex * 11 + sideIdx * 5 + lotIdx * 3;
      const lotGroup = buildHonduranBarrioLot(textures, city, side, lotSeed, lotDepth);
      lotGroup.position.set(0, 0.2, lotZ);
      seg.add(lotGroup);
    });

    // Bandera de Honduras en algunos postes o estela maya en Copán o árbol tropical + señal ALTO
    if (segIndex % 2 === sideIdx) {
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 0.68),
        new THREE.MeshStandardMaterial({
          map: textures.hondurasFlagTexture,
          side: THREE.DoubleSide,
          roughness: 0.72,
        }),
      );
      flag.position.set(side * 5.65 - side * 0.58, 4.45, -segmentLength * 0.5);
      seg.add(flag);
    }

    if ((city.hasMayanRuins || segIndex % 4 === 0) && side === -1) {
      const stela = createCopanStelaModel(textures);
      stela.position.set(side * 6.05, 0.2, segmentLength * 0.04);
      stela.scale.setScalar(0.84);
      seg.add(stela);
    } else {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.2, 3.6, 10),
        new THREE.MeshStandardMaterial({ color: 0x573b26, roughness: 0.92 }),
      );
      trunk.position.set(side * 6.05, 1.98, segmentLength * 0.42);
      trunk.castShadow = true;
      seg.add(trunk);

      const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1e5622, roughness: 0.8 });
      for (let f = 0; f < 6; f++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.65, 6), foliageMat);
        const angle = (f / 6) * Math.PI * 2;
        frond.position.set(
          side * 6.05 + Math.cos(angle) * 0.52,
          3.82,
          segmentLength * 0.42 + Math.sin(angle) * 0.52,
        );
        frond.rotation.z = -Math.cos(angle) * 0.95;
        frond.rotation.x = Math.sin(angle) * 0.95;
        seg.add(frond);
      }

      if (side === 1 && segIndex % 2 === 1) {
        const signPost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8),
          new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.75, roughness: 0.3 }),
        );
        signPost.position.set(5.7, 1.35, -segmentLength * 0.08);
        seg.add(signPost);

        const alto = new THREE.Mesh(
          new THREE.PlaneGeometry(0.76, 0.76),
          new THREE.MeshStandardMaterial({ map: textures.altoSignTexture, side: THREE.DoubleSide }),
        );
        alto.position.set(5.7, 2.42, -segmentLength * 0.08);
        seg.add(alto);
      }
    }
  });

  return seg;
}

function makeMountainRange(
  backdrop: THREE.Group,
  peaks: [number, number, number, number, number][],
  nearHex: number,
  farHex: number,
): void {
  const nearMat = new THREE.MeshStandardMaterial({ color: nearHex, roughness: 0.94 });
  const farMat = new THREE.MeshStandardMaterial({ color: farHex, roughness: 0.96 });
  peaks.forEach(([x, z, r, h, matIdx]) => {
    const hill = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 9),
      matIdx === 0 ? nearMat : farMat,
    );
    hill.position.set(x, h * 0.42, z);
    backdrop.add(hill);
  });
}

export function createCityHorizonBackdrop(
  cityId: CityId,
  textures?: GameTextureSet,
): THREE.Group {
  const backdrop = new THREE.Group();

  if (cityId === 'tegucigalpa') {
    // Cerro El Picacho + Cristo del Picacho + Catedral de Tegucigalpa + Torres Modernas
    makeMountainRange(
      backdrop,
      [
        [-54, -124, 34, 42, 0],
        [-10, -134, 42, 54, 1],
        [34, -128, 36, 44, 0],
        [68, -122, 32, 36, 1],
      ],
      0x1b4332,
      0x264653,
    );

    const statueMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xfef3c7,
      emissiveIntensity: 0.26,
      roughness: 0.45,
    });
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.4, 3.2), statueMat);
    pedestal.position.set(-10, 47.0, -134);
    backdrop.add(pedestal);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.25, 7.6, 10), statueMat);
    body.position.set(-10, 52.8, -134);
    backdrop.add(body);
    const arms = new THREE.Mesh(new THREE.BoxGeometry(8.4, 1.1, 1.1), statueMat);
    arms.position.set(-10, 54.8, -134);
    backdrop.add(arms);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 10), statueMat);
    head.position.set(-10, 57.2, -134);
    backdrop.add(head);

    const glassTowerMat = new THREE.MeshPhysicalMaterial({
      map: textures?.corporateGlassTexture ?? null,
      color: 0x64748b,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.14,
      roughness: 0.18,
      metalness: 0.65,
    });
    const towerA = new THREE.Mesh(new THREE.BoxGeometry(7.2, 28, 7.2), glassTowerMat);
    towerA.position.set(14, 14, -104);
    backdrop.add(towerA);
    const towerB = new THREE.Mesh(new THREE.BoxGeometry(6.2, 22, 6.2), glassTowerMat);
    towerB.position.set(22, 11, -108);
    backdrop.add(towerB);

    // Silueta de la Catedral Metropolitana de Tegucigalpa en el centro-izquierda
    const cathHoriz = buildCathedralMonument(textures, 0xf3ebd8, 0x9a3412);
    cathHoriz.position.set(-28, 0, -104);
    cathHoriz.scale.setScalar(0.92);
    backdrop.add(cathHoriz);
  } else if (cityId === 'san_pedro_sula') {
    // Cordillera del Merendón + Estadio Olímpico + Catedral + Torres Corporativas
    makeMountainRange(
      backdrop,
      [
        [-58, -130, 42, 46, 0],
        [-14, -138, 48, 56, 1],
        [30, -132, 44, 48, 0],
        [72, -126, 36, 40, 1],
      ],
      0x14532d,
      0x1e3a2f,
    );

    const stadiumHoriz = buildEstadioMonument(textures);
    stadiumHoriz.position.set(20, 0, -102);
    stadiumHoriz.scale.setScalar(0.95);
    backdrop.add(stadiumHoriz);

    const cathHoriz = buildCathedralMonument(textures, 0xfde047, 0xf8fafc);
    cathHoriz.position.set(-22, 0, -100);
    cathHoriz.scale.setScalar(0.86);
    backdrop.add(cathHoriz);

    const glassMat = new THREE.MeshPhysicalMaterial({
      map: textures?.corporateGlassTexture ?? null,
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.18,
      roughness: 0.14,
      metalness: 0.78,
    });
    const t1 = new THREE.Mesh(new THREE.BoxGeometry(8.5, 34, 8.5), glassMat);
    t1.position.set(-2, 17, -106);
    backdrop.add(t1);
  } else if (cityId === 'la_ceiba') {
    // Pico Bonito + Costa Caribeña + Faro + Rueda de Carnaval
    makeMountainRange(
      backdrop,
      [
        [-52, -132, 40, 48, 0],
        [-14, -142, 44, 62, 1],
        [24, -134, 34, 42, 0],
      ],
      0x14532d,
      0x0f3d2e,
    );

    const faro = buildFaroLaCeiba();
    faro.position.set(22, 0, -98);
    faro.scale.setScalar(1.2);
    backdrop.add(faro);

    const wheelRing = new THREE.Mesh(
      new THREE.TorusGeometry(9.5, 0.45, 8, 24),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf97316,
        emissiveIntensity: 0.35,
      }),
    );
    wheelRing.position.set(-22, 12.5, -104);
    backdrop.add(wheelRing);
    const wheelStand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 3.2, 13, 4),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 }),
    );
    wheelStand.position.set(-22, 6.5, -104);
    backdrop.add(wheelStand);
  } else if (cityId === 'comayagua') {
    makeMountainRange(
      backdrop,
      [
        [-58, -134, 44, 34, 0],
        [-16, -142, 46, 38, 1],
        [34, -136, 44, 34, 0],
      ],
      0x4d5e36,
      0x5c6b47,
    );
    const cath = buildComayaguaClockCathedral(textures);
    cath.position.set(-2, 0, -100);
    cath.scale.setScalar(1.1);
    backdrop.add(cath);
  } else if (cityId === 'copan') {
    makeMountainRange(
      backdrop,
      [
        [-56, -132, 42, 42, 0],
        [46, -132, 42, 40, 1],
      ],
      0x14532d,
      0x166534,
    );
    const pyramid = buildCopanPyramid(textures);
    pyramid.position.set(0, 0, -104);
    pyramid.scale.setScalar(1.15);
    backdrop.add(pyramid);
  } else {
    const reefMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
    const island = new THREE.Mesh(new THREE.ConeGeometry(34, 16, 12), reefMat);
    island.position.set(-34, 6, -124);
    backdrop.add(island);

    const cruise = buildRoatanCruiseShip();
    cruise.position.set(16, 0, -108);
    cruise.scale.setScalar(1.15);
    backdrop.add(cruise);

    const lighthouse = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 2.0, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 }),
    );
    lighthouse.position.set(-32, 16, -112);
    backdrop.add(lighthouse);
  }

  return backdrop;
}

function buildCathedralMonument(
  textures: GameTextureSet | undefined,
  wallHex: number,
  domeHex: number,
): THREE.Group {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({
    map: textures?.cathedralStoneTexture ?? null,
    color: wallHex,
    roughness: 0.72,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xe7e5e4,
    roughness: 0.58,
  });
  const domeMat = new THREE.MeshStandardMaterial({
    color: domeHex,
    roughness: 0.44,
    metalness: 0.16,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.25,
    metalness: 0.85,
  });
  const woodDoorMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.76,
    metalness: 0.08,
  });
  const plazaMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });

  // Stepped limestone courtyard plinth & grand entrance stairs
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(20, 0.7, 14.5), plazaMat);
  plinth.position.y = 0.35;
  plinth.receiveShadow = true;
  g.add(plinth);

  for (let s = 0; s < 3; s++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(7.6 - s * 0.6, 0.22, 1.4),
      trimMat,
    );
    step.position.set(0, 0.11 + s * 0.22, 7.6 - s * 0.55);
    g.add(step);
  }

  // Main baroque nave
  const nave = new THREE.Mesh(new THREE.BoxGeometry(14.8, 9.4, 10.6), wallMat);
  nave.position.set(0, 5.4, 0);
  nave.castShadow = true;
  nave.receiveShadow = true;
  g.add(nave);

  // Cornice molding band
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.45, 11.2), trimMat);
  cornice.position.set(0, 10.1, 0);
  g.add(cornice);

  // Central portal arch, carved mahogany double doors, pilasters & stained-glass rose window
  const portalFrame = new THREE.Mesh(new THREE.BoxGeometry(4.4, 5.2, 0.8), trimMat);
  portalFrame.position.set(0, 3.3, 5.35);
  g.add(portalFrame);

  const woodDoors = new THREE.Mesh(new THREE.BoxGeometry(2.8, 4.1, 0.95), woodDoorMat);
  woodDoors.position.set(0, 2.75, 5.38);
  g.add(woodDoors);

  [-2.6, 2.6].forEach((px) => {
    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.65, 9.0, 0.6), trimMat);
    pilaster.position.set(px, 5.2, 5.35);
    g.add(pilaster);
  });

  const roseRing = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.18, 10, 20), trimMat);
  roseRing.position.set(0, 7.7, 5.45);
  g.add(roseRing);

  const roseGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.25, 18),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.45,
      roughness: 0.25,
    }),
  );
  roseGlass.rotation.x = Math.PI / 2;
  roseGlass.position.set(0, 7.7, 5.38);
  g.add(roseGlass);

  // Frontón barroco central
  const pediment = new THREE.Mesh(new THREE.ConeGeometry(4.6, 3.4, 4), wallMat);
  pediment.position.set(0, 11.4, 3.8);
  pediment.rotation.y = Math.PI / 4;
  g.add(pediment);

  // Twin bell towers with recessed belfry arches & domed cupolas
  [-5.0, 5.0].forEach((tx) => {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3.3, 14.8, 3.3), wallMat);
    tower.position.set(tx, 7.7, 3.6);
    tower.castShadow = true;
    g.add(tower);

    const towerBand = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.38, 3.6), trimMat);
    towerBand.position.set(tx, 10.2, 3.6);
    g.add(towerBand);

    const belfry = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.55, 2.4, 12), wallMat);
    belfry.position.set(tx, 16.0, 3.6);
    g.add(belfry);

    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.85, 10), goldMat);
    bell.position.set(tx, 15.8, 3.6);
    g.add(bell);

    const cupola = new THREE.Mesh(new THREE.SphereGeometry(1.48, 14, 10), domeMat);
    cupola.position.set(tx, 17.4, 3.6);
    g.add(cupola);

    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.45, 0.18), goldMat);
    crossV.position.set(tx, 19.3, 3.6);
    g.add(crossV);

    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.16, 0.16), goldMat);
    crossH.position.set(tx, 19.55, 3.6);
    g.add(crossH);
  });

  // Central crossing dome & lantern
  const centralDome = new THREE.Mesh(new THREE.SphereGeometry(3.7, 16, 12), domeMat);
  centralDome.position.set(0, 10.8, -1.4);
  g.add(centralDome);

  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.78, 1.5, 10), trimMat);
  lantern.position.set(0, 14.6, -1.4);
  g.add(lantern);

  return g;
}

function buildEstadioMonument(textures: GameTextureSet | undefined): THREE.Group {
  const g = new THREE.Group();
  const bowlMat = new THREE.MeshStandardMaterial({
    map: textures?.stadiumFacadeTexture ?? null,
    color: 0xe2e8f0,
    roughness: 0.66,
    metalness: 0.08,
  });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.78 });
  const roofMat = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    roughness: 0.25,
    metalness: 0.35,
    clearcoat: 0.55,
  });
  const standsMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.75 });
  const pitchMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.88 });
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
  const floodMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 1.05,
  });

  // Exterior oval concrete bowl
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(12.4, 10.6, 7.8, 28, 1, true), bowlMat);
  bowl.position.y = 3.9;
  bowl.scale.set(1.16, 1, 0.86);
  bowl.castShadow = true;
  g.add(bowl);

  // 16 Reinforced concrete perimeter buttress columns
  for (let b = 0; b < 16; b++) {
    const angle = (b / 16) * Math.PI * 2;
    const bx = Math.cos(angle) * 12.1 * 1.16;
    const bz = Math.sin(angle) * 12.1 * 0.86;
    const buttress = new THREE.Mesh(new THREE.BoxGeometry(0.65, 8.0, 0.95), concreteMat);
    buttress.position.set(bx, 4.0, bz);
    buttress.rotation.y = -angle;
    g.add(buttress);
  }

  // Tiered interior spectator stands (Honduras sky-blue seating ring)
  const stands = new THREE.Mesh(new THREE.CylinderGeometry(10.8, 8.6, 4.6, 24, 1, true), standsMat);
  stands.position.y = 2.6;
  stands.scale.set(1.14, 1, 0.84);
  g.add(stands);

  const upperRing = new THREE.Mesh(new THREE.TorusGeometry(11.7, 1.45, 10, 28), roofMat);
  upperRing.rotation.x = Math.PI / 2;
  upperRing.position.y = 7.9;
  upperRing.scale.set(1.16, 0.86, 1);
  g.add(upperRing);

  // Football pitch + crisp white center circle & halfway line
  const pitch = new THREE.Mesh(new THREE.CylinderGeometry(8.9, 8.9, 0.4, 24), pitchMat);
  pitch.position.y = 0.25;
  pitch.scale.set(1.15, 1, 0.86);
  g.add(pitch);

  const centerRing = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.72, 24), lineMat);
  centerRing.rotation.x = -Math.PI / 2;
  centerRing.position.y = 0.47;
  g.add(centerRing);

  const midLine = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 13.5), lineMat);
  midLine.rotation.x = -Math.PI / 2;
  midLine.position.y = 0.47;
  g.add(midLine);

  // Illuminated LED Stadium Scoreboard facing the avenue
  const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.8, 6.4), steelMat);
  boardFrame.position.set(-12.6, 9.6, 0);
  g.add(boardFrame);
  const boardLed = new THREE.Mesh(
    new THREE.PlaneGeometry(5.8, 2.2),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.75,
    }),
  );
  boardLed.rotation.y = -Math.PI / 2;
  boardLed.position.set(-12.92, 9.6, 0);
  g.add(boardLed);

  // 4 Floodlight Pylons (torres de iluminación del estadio)
  [
    [-11.8, -8.0],
    [11.8, -8.0],
    [-11.8, 8.0],
    [11.8, 8.0],
  ].forEach(([fx, fz]) => {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 15.0, 8), steelMat);
    mast.position.set(fx, 7.5, fz);
    g.add(mast);

    const truss = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.5, 0.65), steelMat);
    truss.position.set(fx, 15.1, fz);
    truss.lookAt(0, 2, 0);
    g.add(truss);

    const bank = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 0.72), floodMat);
    bank.position.set(fx, 15.1, fz);
    bank.lookAt(0, 2, 0);
    g.add(bank);
  });

  return g;
}

function buildFaroLaCeiba(): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.42 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.44 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.72 });

  // Coastal stone breakwater platform & keeper's house
  const baseRock = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.8, 1.4, 10), stoneMat);
  baseRock.position.y = 0.7;
  g.add(baseRock);

  const keeperHouse = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.8, 3.6), whiteMat);
  keeperHouse.position.set(0, 2.6, 3.8);
  g.add(keeperHouse);
  const keeperRoof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.5, 4), redMat);
  keeperRoof.position.set(0, 4.75, 3.8);
  keeperRoof.rotation.y = Math.PI / 4;
  g.add(keeperRoof);

  for (let ring = 0; ring < 6; ring++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75 - ring * 0.11, 1.88 - ring * 0.11, 3.1, 16),
      ring % 2 === 0 ? whiteMat : redMat,
    );
    seg.position.y = 2.6 + ring * 3.1;
    seg.castShadow = true;
    g.add(seg);
  }
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.35, 0.55, 16), darkSteel);
  gallery.position.y = 19.8;
  g.add(gallery);

  const beaconGroup = new THREE.Group();
  beaconGroup.position.y = 20.9;
  beaconGroup.userData.spinSpeed = 1.65;
  beaconGroup.userData.spinAxis = 'y';

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.0, 1.8, 14),
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 1.0,
    }),
  );
  beaconGroup.add(beacon);

  // Subtle translucent lighthouse beam cone
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(2.4, 14, 14, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  beam.rotation.z = Math.PI / 2;
  beam.position.set(7.2, 0, 0);
  beaconGroup.add(beam);
  g.add(beaconGroup);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.28, 1.45, 14), redMat);
  cap.position.y = 22.4;
  g.add(cap);

  return g;
}

function buildCoastalPierLaCeiba(textures: GameTextureSet | undefined): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x785032, roughness: 0.88 });
  const thatchMat = new THREE.MeshStandardMaterial({ color: 0xc29b61, roughness: 0.94 });
  const boatMat = new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, roughness: 0.35, clearcoat: 0.7 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1e5622, roughness: 0.8 });
  const seaMat = new THREE.MeshPhysicalMaterial({
    map: textures?.oceanWaterTexture ?? null,
    color: 0xffffff,
    roughness: 0.12,
    clearcoat: 0.9,
  });

  // Wooden coastal pier extending over the Caribbean sea
  const deck = new THREE.Mesh(new THREE.BoxGeometry(17, 0.34, 3.8), woodMat);
  deck.position.set(6.5, 1.25, 0);
  deck.castShadow = true;
  g.add(deck);

  [-0.5, 4.5, 9.5, 14.0].forEach((px) => {
    [-1.55, 1.55].forEach((pz) => {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 2.6, 8), woodMat);
      piling.position.set(px, 0.85, pz);
      g.add(piling);

      if (px > 0) {
        const lantern = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 8, 8),
          new THREE.MeshStandardMaterial({
            color: 0xfef3c7,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.9,
          }),
        );
        lantern.position.set(px, 2.25, pz);
        g.add(lantern);
      }
    });
  });

  // Pier wooden safety rails
  [-1.65, 1.65].forEach((rz) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.12, 0.1), woodMat);
    rail.position.set(7.0, 2.05, rz);
    g.add(rail);
  });

  // Coastal beach palapa hut + leaning beach coconut palm
  const palapaRoof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 2.0, 10), thatchMat);
  palapaRoof.position.set(-2.5, 3.3, 4.8);
  g.add(palapaRoof);
  const palapaPost = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.6, 8), woodMat);
  palapaPost.position.set(-2.5, 1.3, 4.8);
  g.add(palapaPost);

  const palmTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 5.6, 10), woodMat);
  palmTrunk.position.set(-1.6, 2.7, -5.2);
  palmTrunk.rotation.z = -0.18;
  g.add(palmTrunk);
  for (let f = 0; f < 6; f++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.0, 6), foliageMat);
    const a = (f / 6) * Math.PI * 2;
    frond.position.set(-1.1 + Math.cos(a) * 0.65, 5.4, -5.2 + Math.sin(a) * 0.65);
    frond.rotation.z = -Math.cos(a) * 0.95;
    frond.rotation.x = Math.sin(a) * 0.95;
    g.add(frond);
  }

  // White shoreline sea-foam surf strip
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 18),
    new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.65 }),
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(-2.2, 0.06, 0);
  g.add(foam);

  // Coastal fishing boat gently bobbing beside the pier
  const boatGroup = new THREE.Group();
  boatGroup.position.set(11.5, 0.22, -3.6);
  boatGroup.userData.bobPhase = 0.7;
  const boatHull = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.88, 1.9), boatMat);
  boatHull.position.y = 0.2;
  boatGroup.add(boatHull);
  const boatStripe = new THREE.Mesh(
    new THREE.BoxGeometry(4.66, 0.26, 1.94),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 }),
  );
  boatStripe.position.y = 0.36;
  boatGroup.add(boatStripe);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95, 1.3), boatMat);
  cabin.position.set(-0.6, 0.95, 0);
  boatGroup.add(cabin);
  g.add(boatGroup);

  const lagoon = new THREE.Mesh(new THREE.PlaneGeometry(24, 18), seaMat);
  lagoon.rotation.x = -Math.PI / 2;
  lagoon.position.set(8, 0.02, 0);
  g.add(lagoon);

  return g;
}

function buildComayaguaClockCathedral(textures: GameTextureSet | undefined): THREE.Group {
  const g = buildCathedralMonument(textures, 0xf5f5f4, 0x9a3412);
  const clockFace = new THREE.Mesh(
    new THREE.CylinderGeometry(1.18, 1.18, 0.35, 18),
    new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xfde047,
      emissiveIntensity: 0.48,
    }),
  );
  clockFace.rotation.x = Math.PI / 2;
  clockFace.position.set(-5.0, 11.6, 5.32);
  g.add(clockFace);
  return g;
}

function buildCopanPyramid(textures: GameTextureSet | undefined): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    map: textures?.copanStoneTexture ?? null,
    color: 0xa8a29e,
    roughness: 0.9,
  });
  const templeRedMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.78 });

  for (let lvl = 0; lvl < 5; lvl++) {
    const size = 20 - lvl * 3.1;
    const tier = new THREE.Mesh(new THREE.BoxGeometry(size, 3.0, size * 0.78), stoneMat);
    tier.position.set(0, 1.5 + lvl * 2.9, 0);
    tier.castShadow = true;
    g.add(tier);
  }
  const stairs = new THREE.Mesh(new THREE.BoxGeometry(4.8, 14.5, 3.2), stoneMat);
  stairs.position.set(0, 7.0, 6.2);
  stairs.rotation.x = -0.52;
  g.add(stairs);

  const shrine = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.8, 4.8), templeRedMat);
  shrine.position.set(0, 16.4, 0);
  g.add(shrine);
  return g;
}

function buildRoatanCruiseShip(): THREE.Group {
  const shipGroup = new THREE.Group();
  shipGroup.userData.bobPhase = 1.4;
  const hullMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.35, clearcoat: 0.6 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  const funnelMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
  const windowGlow = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.55,
  });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(34, 4.2, 8.2), hullMat);
  hull.position.y = 2.1;
  shipGroup.add(hull);
  const deck1 = new THREE.Mesh(new THREE.BoxGeometry(30, 3.2, 7.4), deckMat);
  deck1.position.y = 5.6;
  shipGroup.add(deck1);
  const cabinLights = new THREE.Mesh(new THREE.BoxGeometry(28, 0.55, 7.55), windowGlow);
  cabinLights.position.y = 5.8;
  shipGroup.add(cabinLights);
  const deck2 = new THREE.Mesh(new THREE.BoxGeometry(23, 2.8, 6.2), deckMat);
  deck2.position.y = 8.4;
  shipGroup.add(deck2);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(9.5, 2.2, 5.8), deckMat);
  bridge.position.set(-7.5, 10.7, 0);
  shipGroup.add(bridge);
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.9, 4.0, 12), funnelMat);
  funnel.position.set(4.5, 11.8, 0);
  shipGroup.add(funnel);
  return shipGroup;
}

/**
 * Genera proceduralmente un elemento icónico fotorrealista para la ciudad activa
 * conforme el jugador avanza por la ruta.
 */
export function createCityLandmarkMonument(
  cityId: CityId,
  textures: GameTextureSet,
  variantSeed: number,
): { mesh: THREE.Group; preferredSide: -1 | 1; offsetX: number } {
  const variant = variantSeed % 3;

  if (cityId === 'tegucigalpa') {
    if (variant === 0) {
      const m = buildCathedralMonument(textures, 0xf3ebd8, 0x9a3412);
      m.rotation.y = -Math.PI / 2;
      m.scale.setScalar(1.04);
      return { mesh: m, preferredSide: 1, offsetX: 24 };
    }
    if (variant === 1) {
      const m = buildEstadioMonument(textures);
      m.scale.setScalar(0.98);
      return { mesh: m, preferredSide: 1, offsetX: 27 };
    }
    const g = new THREE.Group();
    const plaza = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.6, 12),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 }),
    );
    plaza.position.y = 0.3;
    g.add(plaza);
    const glassMat = new THREE.MeshPhysicalMaterial({
      map: textures.corporateGlassTexture,
      roughness: 0.16,
      metalness: 0.72,
      clearcoat: 0.85,
    });
    const tA = new THREE.Mesh(new THREE.BoxGeometry(6.8, 25, 6.8), glassMat);
    tA.position.set(-1.5, 12.8, 0);
    g.add(tA);
    const tB = new THREE.Mesh(new THREE.BoxGeometry(5.4, 18, 5.4), glassMat);
    tB.position.set(4.5, 9.3, -2.5);
    g.add(tB);
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.0 }),
    );
    beacon.position.set(-1.5, 25.8, 0);
    g.add(beacon);
    return { mesh: g, preferredSide: 1, offsetX: 23 };
  }

  if (cityId === 'san_pedro_sula') {
    if (variant === 0) {
      const m = buildEstadioMonument(textures);
      m.scale.setScalar(1.04);
      return { mesh: m, preferredSide: 1, offsetX: 27 };
    }
    if (variant === 1) {
      const g = new THREE.Group();
      const glassMat = new THREE.MeshPhysicalMaterial({
        map: textures.corporateGlassTexture,
        color: 0x7dd3fc,
        roughness: 0.12,
        metalness: 0.8,
        clearcoat: 0.9,
      });
      const tower = new THREE.Mesh(new THREE.BoxGeometry(7.6, 29, 7.6), glassMat);
      tower.position.set(0, 14.5, 0);
      g.add(tower);
      const annex = new THREE.Mesh(new THREE.BoxGeometry(6.2, 20, 6.2), glassMat);
      annex.position.set(6.4, 10, 3.2);
      g.add(annex);
      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.25, 5.2, 8),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 }),
      );
      spire.position.set(0, 31.6, 0);
      g.add(spire);
      return { mesh: g, preferredSide: 1, offsetX: 24 };
    }
    const m = buildCathedralMonument(textures, 0xfde047, 0xf8fafc);
    m.rotation.y = -Math.PI / 2;
    return { mesh: m, preferredSide: 1, offsetX: 24 };
  }

  if (cityId === 'la_ceiba') {
    if (variant === 0) {
      return { mesh: buildCoastalPierLaCeiba(textures), preferredSide: 1, offsetX: 21 };
    }
    if (variant === 1) {
      return { mesh: buildFaroLaCeiba(), preferredSide: 1, offsetX: 22 };
    }
    // Animated Grand Carnival Ferris Wheel (Gran Carnaval de La Ceiba)
    const g = new THREE.Group();
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(0, 9.6, 0);
    wheelGroup.userData.spinSpeed = 0.42;
    wheelGroup.userData.spinAxis = 'z';

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(6.8, 0.36, 8, 24),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf97316,
        emissiveIntensity: 0.45,
      }),
    );
    wheelGroup.add(rim);

    const spokeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7 });
    const podColors = [0x0ea5e9, 0xef4444, 0xfacc15, 0x10b981];
    for (let s = 0; s < 8; s++) {
      const a = (s / 8) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 13.4, 6), spokeMat);
      spoke.rotation.z = a;
      wheelGroup.add(spoke);

      const pod = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.05, 0.9),
        new THREE.MeshStandardMaterial({
          color: podColors[s % podColors.length],
          roughness: 0.4,
        }),
      );
      pod.position.set(Math.cos(a) * 6.8, Math.sin(a) * 6.8, 0);
      wheelGroup.add(pod);
    }
    g.add(wheelGroup);

    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 2.6, 9.8, 4),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 }),
    );
    stand.position.set(0, 4.9, 0);
    g.add(stand);
    return { mesh: g, preferredSide: 1, offsetX: 23 };
  }

  if (cityId === 'comayagua') {
    if (variant === 0) {
      const m = buildComayaguaClockCathedral(textures);
      m.rotation.y = -Math.PI / 2;
      m.scale.setScalar(1.06);
      return { mesh: m, preferredSide: 1, offsetX: 24 };
    }
    const g = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.82 });
    const water = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, roughness: 0.1, clearcoat: 0.9 });
    const basePlaza = new THREE.Mesh(new THREE.BoxGeometry(14, 0.35, 14), stone);
    basePlaza.position.y = 0.18;
    g.add(basePlaza);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.2, 1.2, 8), stone);
    basin.position.y = 0.85;
    g.add(basin);
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.25, 12), water);
    pool.position.y = 1.45;
    g.add(pool);
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.1, 3.8, 10), stone);
    spire.position.y = 2.65;
    g.add(spire);
    return { mesh: g, preferredSide: 1, offsetX: 22 };
  }

  if (cityId === 'copan') {
    if (variant === 0) {
      return { mesh: buildCopanPyramid(textures), preferredSide: 1, offsetX: 26 };
    }
    const g = new THREE.Group();
    [-3.6, 3.6].forEach((sx, idx) => {
      const stela = createCopanStelaModel(textures);
      stela.position.set(sx, 0, idx * 3.5);
      stela.scale.setScalar(1.48);
      g.add(stela);
    });
    return { mesh: g, preferredSide: 1, offsetX: 22 };
  }

  // Roatán
  if (variant === 0) {
    return { mesh: buildCoastalPierLaCeiba(textures), preferredSide: 1, offsetX: 21 };
  }
  const ship = buildRoatanCruiseShip();
  ship.rotation.y = Math.PI / 2;
  return { mesh: ship, preferredSide: 1, offsetX: 33 };
}


import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CITY_CATALOG, type CityCatalogItem } from '../data/catalog';
import { soundEngine } from '../audio/soundEngine';
import {
  GAME_CONSTANTS,
  type CityId,
  type CollectibleKind,
  type GamePhase,
  type GraphicsQuality,
  type HudState,
  type InputAction,
  type IntroCaptionState,
  type LaneIndex,
  type ObstacleKind,
} from '../types/game';
import {
  createAutobusModel,
  createCarModel,
  createCityHorizonBackdrop,
  createCityLandmarkMonument,
  createDecoratedBusModel,
  createFiveCentCoinModel,
  createGuacamayaModel,
  createHonduranCitySegment,
  createLowBarrierModel,
  createMototaxiModel,
  createOverheadArchModel,
  createPoliceOfficerModel,
  createRealisticHumanCharacter,
  createSchoolBusModel,
  createTruckModel,
  type CharacterBuildOptions,
  type GuacamayaRig,
  type PlayerRig,
  type PoliceRig,
} from './models';
import { createGameTextures, type GameTextureSet } from './textures';

interface ActiveObstacle {
  id: number;
  kind: ObstacleKind;
  lane: LaneIndex;
  mesh: THREE.Group;
  halfWidth: number;
  halfDepth: number;
  minY: number;
  maxY: number;
  roofHeight: number | null; // Walkable roof height if traversable
  extraSpeed: number; // Negative = drives forward with city traffic
  hit: boolean;
  horned: boolean;
}

interface ActiveCollectible {
  id: number;
  kind: CollectibleKind;
  lane: LaneIndex;
  mesh: THREE.Group;
  baseY: number;
  phaseOffset: number;
  collected: boolean;
}

interface PickupSpark {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

export interface RunSummary {
  score: number;
  distance: number;
  coins: number;
  city: CityId;
}

const SEGMENT_LENGTH = 24;
const SEGMENT_COUNT = 8;

const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function getCityMeta(cityId: CityId): CityCatalogItem {
  return CITY_CATALOG.find((c) => c.id === cityId) ?? CITY_CATALOG[0];
}

export class RutaCatrachaEngine {
  private container: HTMLElement;
  private onHudUpdate: (hud: HudState) => void;
  private onRunComplete: (summary: RunSummary) => void;
  private onIntroComplete: () => void;
  private onContextLostChange?: (lost: boolean) => void;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: GameTextureSet;
  private isSoftwareGl: boolean;
  private pmremEnvTex: THREE.Texture;

  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;

  private cityId: CityId;
  private cityMeta: CityCatalogItem;
  private player: PlayerRig;
  private characterOpts: CharacterBuildOptions;
  private police: PoliceRig;
  private introCar: THREE.Group;
  private macaws: {
    rig: GuacamayaRig;
    baseX: number;
    baseY: number;
    baseZ: number;
    speed: number;
    phase: number;
  }[] = [];

  private roadSegments: THREE.Group[] = [];
  private proceduralLandmarks: THREE.Group[] = [];
  private landmarkSpawnSeq = 0;
  private cityBackdrop: THREE.Group | null = null;
  private obstacles: ActiveObstacle[] = [];
  private collectibles: ActiveCollectible[] = [];
  private sparks: PickupSpark[] = [];

  private phase: GamePhase = 'menu';
  private targetLane: LaneIndex = 0;
  private prevLane: LaneIndex = 0;
  private playerX = 0;
  private playerY = 0;
  private groundY = 0;
  private activeRoofId: number | null = null;
  private verticalVel = 0;
  private isGrounded = true;
  private duckTimer = 0;
  private landingTimer = 0;
  private stumbleTimer = 0;
  private invulnTimer = 0;
  private shakeTimer = 0;
  private celebrateTimer = 0;
  private fallProgress = 0;
  private runCycle = 0;
  private lastStepPhase = 0;

  // Cinematic 9-step intro (A..I)
  private introTime = 0;
  private introLastStep = '';
  private introCaption: IntroCaptionState | null = null;
  private policeChaseTimer = 0;

  private speed: number = GAME_CONSTANTS.BASE_SPEED;
  private distance = 0;
  private score = 0;
  private highScore = 0;
  private runCoins = 0;
  private lives: number = GAME_CONSTANTS.MAX_LIVES;

  private feedbackText: string | null = null;
  private feedbackTone: 'gold' | 'green' | 'red' | null = null;
  private feedbackSeq = 0;
  private feedbackTimer = 0;
  private lastHornTime = -10;

  private nextEntityId = 1;
  private spawnZCursor = -42;
  private lastHudPush = 0;

  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver;

  constructor(
    container: HTMLElement,
    initialCharacter: CharacterBuildOptions,
    initialCity: CityId,
    initialHighScore: number,
    initialQuality: GraphicsQuality,
    callbacks: {
      onHudUpdate: (hud: HudState) => void;
      onRunComplete: (summary: RunSummary) => void;
      onIntroComplete: () => void;
      onContextLostChange?: (lost: boolean) => void;
    },
  ) {
    this.container = container;
    this.characterOpts = { ...initialCharacter };
    this.cityId = initialCity;
    this.cityMeta = getCityMeta(initialCity);
    this.highScore = initialHighScore;
    this.onHudUpdate = callbacks.onHudUpdate;
    this.onRunComplete = callbacks.onRunComplete;
    this.onIntroComplete = callbacks.onIntroComplete;
    this.onContextLostChange = callbacks.onContextLostChange;

    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && initialQuality !== 'optimized',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.applyQualitySettings(initialQuality);

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(this.cityMeta.skyHex);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.Fog(this.cityMeta.fogHex, 68, 225);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.pmremEnvTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.pmremEnvTex;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 280);
    this.camera.position.set(3.2, 3.0, 6.2);

    this.textures = createGameTextures(this.renderer.capabilities.getMaxAnisotropy());

    this.setupLighting();
    this.setupWorld();

    this.player = createRealisticHumanCharacter(this.characterOpts);
    this.scene.add(this.player.root);

    this.police = createPoliceOfficerModel();
    this.police.root.visible = false;
    this.scene.add(this.police.root);

    this.introCar = createCarModel(0x1e3a8a);
    this.introCar.visible = false;
    this.scene.add(this.introCar);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.pushHud(true);
    this.clock.start();
    this.startLoop();
  }

  public applyQualitySettings(quality: GraphicsQuality): void {
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      return;
    }

    if (quality === 'ultra') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } else if (quality === 'high') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } else {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
    }
  }

  public setHighScore(score: number): void {
    this.highScore = Math.max(this.highScore, score);
  }

  public setCity(cityId: CityId): void {
    if (this.cityId === cityId) return;
    this.cityId = cityId;
    this.cityMeta = getCityMeta(cityId);

    this.scene.background = new THREE.Color(this.cityMeta.skyHex);
    this.scene.fog = new THREE.Fog(this.cityMeta.fogHex, 68, 225);
    if (this.sunLight) {
      this.sunLight.color.setHex(this.cityMeta.sunHex);
      this.sunLight.intensity = this.cityMeta.sunIntensity;
    }

    for (const seg of this.roadSegments) {
      this.disposeObjectTree(seg);
      this.scene.remove(seg);
    }
    this.roadSegments = [];

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const seg = createHonduranCitySegment(this.textures, this.cityMeta, SEGMENT_LENGTH, i);
      seg.position.z = 14 - i * SEGMENT_LENGTH;
      this.roadSegments.push(seg);
      this.scene.add(seg);
    }

    if (this.cityBackdrop) {
      this.disposeObjectTree(this.cityBackdrop);
      this.scene.remove(this.cityBackdrop);
    }
    this.cityBackdrop = createCityHorizonBackdrop(this.cityId, this.textures);
    this.scene.add(this.cityBackdrop);
    this.rebuildProceduralLandmarks();

    this.pushHud(true);
  }

  public setCharacterAppearance(opts: CharacterBuildOptions): void {
    if (
      this.characterOpts.characterId === opts.characterId &&
      this.characterOpts.outfitId === opts.outfitId &&
      this.characterOpts.shoeId === opts.shoeId &&
      this.characterOpts.hatId === opts.hatId &&
      this.characterOpts.backpackId === opts.backpackId &&
      this.characterOpts.accessoryId === opts.accessoryId
    ) {
      return;
    }

    this.characterOpts = { ...opts };
    const pos = this.player.root.position.clone();
    const rot = this.player.root.rotation.clone();
    this.disposeObjectTree(this.player.root);
    this.scene.remove(this.player.root);

    this.player = createRealisticHumanCharacter(this.characterOpts);
    this.player.root.position.copy(pos);
    this.player.root.rotation.copy(rot);
    this.scene.add(this.player.root);
  }

  public triggerCelebration(duration = 1.6): void {
    this.celebrateTimer = duration;
    soundEngine.playCelebrate();
  }

  private disposeObjectTree(root: THREE.Object3D): void {
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
  }

  private setupLighting(): void {
    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x574c41, 0.9);
    this.hemiLight.position.set(0, 45, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(this.cityMeta.sunHex, this.cityMeta.sunIntensity);
    this.sunLight.position.set(18, 28, 16);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 96;
    const d = 24;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    const rim = new THREE.DirectionalLight(0x93c5fd, 0.55);
    rim.position.set(-16, 12, -26);
    this.scene.add(rim);
  }

  private setupWorld(): void {
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const seg = createHonduranCitySegment(this.textures, this.cityMeta, SEGMENT_LENGTH, i);
      seg.position.z = 14 - i * SEGMENT_LENGTH;
      this.roadSegments.push(seg);
      this.scene.add(seg);
    }

    this.cityBackdrop = createCityHorizonBackdrop(this.cityId, this.textures);
    this.scene.add(this.cityBackdrop);
    this.rebuildProceduralLandmarks();

    const macawCoords: [number, number, number, number][] = [
      [-9, 10.2, -30, 3.2],
      [8, 11.8, -50, 2.7],
      [-4, 13.0, -72, 3.5],
    ];
    macawCoords.forEach(([x, y, z, spd], i) => {
      const rig = createGuacamayaModel();
      rig.root.position.set(x, y, z);
      rig.root.scale.setScalar(1.3);
      this.scene.add(rig.root);
      this.macaws.push({ rig, baseX: x, baseY: y, baseZ: z, speed: spd, phase: i * 2.1 });
    });
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.onContextLostChange?.(true);
  };

  private handleContextRestored = (): void => {
    this.onContextLostChange?.(false);
  };

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private resetPlayerFacialExpression(): void {
    this.player.leftBrow.rotation.z = 0;
    this.player.rightBrow.rotation.z = 0;
    this.player.leftBrow.position.y = 0.236;
    this.player.rightBrow.position.y = 0.236;
    this.player.mouthMesh.scale.set(1, 1, 1);
  }

  public startIntro(): void {
    if (this.cityId !== 'tegucigalpa') {
      this.setCity('tegucigalpa');
    }
    soundEngine.unlock();
    soundEngine.startMusic('chase');
    this.clearDynamicEntities();

    this.phase = 'intro';
    this.introTime = 0;
    this.introLastStep = '';
    this.targetLane = 0;
    this.prevLane = 0;
    this.playerX = 0;
    this.playerY = 0;
    this.groundY = 0;
    this.activeRoofId = null;
    this.verticalVel = 0;
    this.isGrounded = true;
    this.duckTimer = 0;
    this.landingTimer = 0;
    this.stumbleTimer = 0;
    this.invulnTimer = 0;
    this.fallProgress = 0;

    this.player.root.visible = true;
    this.player.root.position.set(0, 0, 2.2);
    this.player.root.rotation.set(0, 0, 0);
    this.player.bodyPivot.rotation.set(0, 0, 0);
    this.player.bodyPivot.position.set(0, 0, 0);
    this.player.bodyPivot.scale.set(1, 1, 1);
    this.player.shadowMesh.position.y = 0.025;
    this.resetPlayerFacialExpression();

    this.introCar.visible = true;
    this.introCar.position.set(0.3, 0, -4.6);
    this.introCar.rotation.set(0, Math.PI / 2, 0);

    this.police.root.visible = true;
    this.police.root.position.set(5.8, 0, -2.2);
    this.police.root.rotation.set(0, 0, 0);
    this.police.ticketMesh.visible = false;

    this.updateIntroCaptions('A');
    this.pushHud(true);
  }

  public skipIntro(): void {
    if (this.phase !== 'intro') return;
    this.introCar.visible = false;
    this.resetPlayerFacialExpression();
    this.onIntroComplete();
    this.startGame(true);
  }

  public startGame(fromIntro = false): void {
    soundEngine.unlock();
    soundEngine.startMusic('run');
    this.clearDynamicEntities();

    this.introCar.visible = false;
    this.introCaption = null;
    this.phase = 'playing';
    this.targetLane = 0;
    this.prevLane = 0;
    this.playerX = 0;
    this.playerY = 0;
    this.groundY = 0;
    this.activeRoofId = null;
    this.verticalVel = 0;
    this.isGrounded = true;
    this.duckTimer = 0;
    this.landingTimer = 0;
    this.stumbleTimer = 0;
    this.invulnTimer = 0;
    this.shakeTimer = 0;
    this.celebrateTimer = 0;
    this.fallProgress = 0;
    this.player.root.visible = true;
    this.player.root.position.set(0, 0, 0);
    this.player.root.rotation.set(0, 0, 0);
    this.player.bodyPivot.rotation.set(0, 0, 0);
    this.player.bodyPivot.position.set(0, 0, 0);
    this.player.bodyPivot.scale.set(1, 1, 1);
    this.player.headGroup.rotation.set(0, 0, 0);
    this.player.shadowMesh.position.y = 0.025;
    this.resetPlayerFacialExpression();

    this.police.root.visible = true;
    this.police.ticketMesh.visible = true;
    this.police.root.rotation.set(0, 0, 0);
    this.policeChaseTimer = fromIntro ? 4.4 : 2.6;
    if (fromIntro) {
      soundEngine.playPoliceWhistle();
    }

    this.speed = GAME_CONSTANTS.BASE_SPEED;
    this.distance = 0;
    this.score = 0;
    this.runCoins = 0;
    this.lives = GAME_CONSTANTS.MAX_LIVES;

    this.feedbackText = fromIntro
      ? '¡CORRE Y SALTA SOBRE LOS AUTOBUSES!'
      : `${this.cityMeta.name.toUpperCase()} · ¡SALTA A LOS TECHOS!`;
    this.feedbackTone = 'gold';
    this.feedbackSeq += 1;
    this.feedbackTimer = 2.4;

    this.spawnZCursor = -44;
    while (this.spawnZCursor > -156) {
      this.spawnPatternAt(this.spawnZCursor);
      this.spawnZCursor -= 30;
    }

    this.pushHud(true);
  }

  public pauseGame(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    soundEngine.stopMusic();
    this.pushHud(true);
  }

  public resumeGame(): void {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.clock.getDelta();
    soundEngine.startMusic('run');
    this.pushHud(true);
  }

  public returnToMenu(): void {
    this.clearDynamicEntities();
    this.phase = 'menu';
    this.introCar.visible = false;
    this.police.root.visible = false;
    this.introCaption = null;
    this.targetLane = 0;
    this.prevLane = 0;
    this.playerX = 0;
    this.playerY = 0;
    this.groundY = 0;
    this.activeRoofId = null;
    this.verticalVel = 0;
    this.isGrounded = true;
    this.duckTimer = 0;
    this.landingTimer = 0;
    this.stumbleTimer = 0;
    this.invulnTimer = 0;
    this.fallProgress = 0;
    this.player.root.visible = true;
    this.player.root.position.set(0, 0, 0);
    this.player.root.rotation.set(0, 0, 0);
    this.player.bodyPivot.rotation.set(0, 0, 0);
    this.player.bodyPivot.position.set(0, 0, 0);
    this.player.bodyPivot.scale.set(1, 1, 1);
    this.player.headGroup.rotation.set(0, 0, 0);
    this.player.shadowMesh.position.y = 0.025;
    this.resetPlayerFacialExpression();
    soundEngine.setMusicContext('menu');
    this.pushHud(true);
  }

  public handleInput(action: InputAction): void {
    if (this.phase !== 'playing') return;
    soundEngine.unlock();

    if (action === 'left') {
      if (this.targetLane > -1) {
        this.prevLane = this.targetLane;
        this.targetLane = (this.targetLane - 1) as LaneIndex;
        soundEngine.playLaneSwitch();
      }
    } else if (action === 'right') {
      if (this.targetLane < 1) {
        this.prevLane = this.targetLane;
        this.targetLane = (this.targetLane + 1) as LaneIndex;
        soundEngine.playLaneSwitch();
      }
    } else if (action === 'jump') {
      if (this.isGrounded) {
        this.duckTimer = 0;
        this.isGrounded = false;
        this.verticalVel = GAME_CONSTANTS.JUMP_VELOCITY;
        soundEngine.playJump();
      }
    } else if (action === 'duck') {
      if (!this.isGrounded) {
        this.verticalVel = Math.min(this.verticalVel, -26);
      }
      this.duckTimer = GAME_CONSTANTS.DUCK_DURATION;
      soundEngine.playDuck();
    }
  }

  private clearDynamicEntities(): void {
    for (const obs of this.obstacles) {
      this.disposeObjectTree(obs.mesh);
      this.scene.remove(obs.mesh);
    }
    this.obstacles = [];

    for (const col of this.collectibles) {
      this.disposeObjectTree(col.mesh);
      this.scene.remove(col.mesh);
    }
    this.collectibles = [];

    for (const sp of this.sparks) {
      this.scene.remove(sp.mesh);
      sp.mesh.geometry.dispose();
      (sp.mesh.material as THREE.Material).dispose();
    }
    this.sparks = [];
  }

  private spawnPatternAt(zPos: number): void {
    const lanes: LaneIndex[] = [-1, 0, 1];
    const safeLane = lanes[Math.floor(Math.random() * lanes.length)];
    const otherLanes = lanes.filter((l) => l !== safeLane);
    const patternRoll = Math.random();

    // Special Formation 1: Long Bus Convoy for Rooftop Surfing & Bus-to-Bus Jumping!
    if (patternRoll < 0.44) {
      const convoyLane = otherLanes[0];
      const adjacentLane = safeLane;
      const busKinds: ObstacleKind[] = ['schoolBus', 'publicBus', 'decoratedBus'];
      const firstBus = busKinds[Math.floor(Math.random() * busKinds.length)];
      const secondBus = busKinds[Math.floor(Math.random() * busKinds.length)];

      // Lead car step-up + 10m bus in convoyLane, and second 10m bus ahead in adjacentLane
      this.spawnObstacle('car', convoyLane, zPos + 5.8);
      this.spawnObstacle(firstBus, convoyLane, zPos - 3.6);
      this.spawnCoinLine(convoyLane, zPos - 0.4, 4, 3.68);

      this.spawnObstacle(secondBus, adjacentLane, zPos - 14.8);
      this.spawnCoinLine(adjacentLane, zPos - 11.4, 4, 3.72);

      // Optional overhead hazard above second bus to test ducking on rooftops!
      if (Math.random() < 0.45) {
        this.spawnElevatedRoofHazard(adjacentLane, zPos - 15.2, 3.0);
      }

      // Street coins on remaining open lane
      const openLane = otherLanes[1];
      this.spawnCoinLine(openLane, zPos - 3, 4, 0.85);
      return;
    }

    // Standard varied urban Honduras traffic pattern
    const doubleBlockChance = Math.min(0.68, 0.36 + (this.speed - GAME_CONSTANTS.BASE_SPEED) * 0.02);
    const blockCount = Math.random() < doubleBlockChance ? 2 : 1;

    for (let i = 0; i < blockCount; i++) {
      const lane = otherLanes[i];
      const roll = Math.random();
      let kind: ObstacleKind;
      if (roll < 0.22) kind = 'schoolBus';
      else if (roll < 0.42) kind = 'publicBus';
      else if (roll < 0.56) kind = 'decoratedBus';
      else if (roll < 0.7) kind = 'mototaxi';
      else if (roll < 0.83) kind = 'car';
      else if (roll < 0.92) kind = 'truck';
      else kind = 'lowBarrier';

      const obsZ = zPos + (i === 1 ? -3.4 : 0);
      this.spawnObstacle(kind, lane, obsZ);

      // Place high-value rooftop coin trail over walkable buses & trucks!
      if (kind === 'schoolBus' || kind === 'publicBus' || kind === 'decoratedBus' || kind === 'truck') {
        const roofCoinY = kind === 'truck' ? 3.85 : 3.68;
        this.spawnCoinLine(lane, obsZ + 1.4, 3, roofCoinY);
      }
    }

    const safeActionRoll = Math.random();
    if (safeActionRoll < 0.26) {
      this.spawnObstacle('lowBarrier', safeLane, zPos);
      this.spawnCoinArc(safeLane, zPos);
    } else if (safeActionRoll < 0.48) {
      this.spawnObstacle('overheadArch', safeLane, zPos);
      this.spawnCoinLine(safeLane, zPos - 3, 3, 0.55);
    } else {
      this.spawnCoinLine(safeLane, zPos - 4, 4, 0.85);
    }
  }

  private spawnElevatedRoofHazard(lane: LaneIndex, zPos: number, roofY: number): void {
    const mesh = createOverheadArchModel(this.textures);
    mesh.position.set(lane * GAME_CONSTANTS.LANE_WIDTH, roofY, zPos);
    this.scene.add(mesh);

    this.obstacles.push({
      id: this.nextEntityId++,
      kind: 'overheadArch',
      lane,
      mesh,
      halfWidth: 1.0,
      halfDepth: 0.32,
      minY: roofY + 1.15,
      maxY: roofY + 2.55,
      roofHeight: null,
      extraSpeed: -7.5, // Moves along with the bus beneath it!
      hit: false,
      horned: true,
    });
  }

  private spawnObstacle(kind: ObstacleKind, lane: LaneIndex, zPos: number): void {
    const variant = Math.floor(Math.random() * 3);
    let mesh: THREE.Group;
    let halfWidth = 0.95;
    let halfDepth = 1.2;
    let minY = 0;
    let maxY = 1.6;
    let roofHeight: number | null = null;
    let extraSpeed = 0;

    if (kind === 'schoolBus') {
      mesh = createSchoolBusModel(this.textures);
      halfWidth = 1.21;
      halfDepth = 4.8;
      minY = 0;
      maxY = 2.94;
      roofHeight = 2.92;
      extraSpeed = -7.5; // Drives forward in same lane direction -> walkable moving roof!
    } else if (kind === 'publicBus') {
      mesh = createAutobusModel(this.textures, variant);
      halfWidth = 1.22;
      halfDepth = 5.0;
      minY = 0;
      maxY = 3.0;
      roofHeight = 2.98;
      extraSpeed = -7.5;
    } else if (kind === 'decoratedBus') {
      mesh = createDecoratedBusModel(this.textures);
      halfWidth = 1.23;
      halfDepth = 5.15;
      minY = 0;
      maxY = 3.04;
      roofHeight = 3.02;
      extraSpeed = -7.5;
    } else if (kind === 'truck') {
      mesh = createTruckModel();
      halfWidth = 1.18;
      halfDepth = 2.95;
      minY = 0;
      maxY = 3.05;
      roofHeight = 3.02;
      extraSpeed = -7.0;
    } else if (kind === 'car') {
      const carColors = [0x1e3a8a, 0x334155, 0x991b1b, 0x0f766e, 0xd4d4d8];
      mesh = createCarModel(carColors[Math.floor(Math.random() * carColors.length)]);
      halfWidth = 0.98;
      halfDepth = 2.05;
      minY = 0;
      maxY = 1.48;
      roofHeight = 1.46; // Cars also act as low step-up roofs!
      extraSpeed = -6.0;
    } else if (kind === 'mototaxi') {
      mesh = createMototaxiModel();
      halfWidth = 0.78;
      halfDepth = 1.15;
      minY = 0;
      maxY = 1.75;
      roofHeight = null;
      extraSpeed = -4.5;
    } else if (kind === 'lowBarrier') {
      mesh = createLowBarrierModel();
      halfWidth = 0.92;
      halfDepth = 0.35;
      minY = 0;
      maxY = 0.92;
      roofHeight = null;
    } else {
      mesh = createOverheadArchModel(this.textures);
      halfWidth = 1.02;
      halfDepth = 0.32;
      minY = 1.18;
      maxY = 2.55;
      roofHeight = null;
    }

    mesh.position.set(lane * GAME_CONSTANTS.LANE_WIDTH, 0, zPos);
    this.scene.add(mesh);

    this.obstacles.push({
      id: this.nextEntityId++,
      kind,
      lane,
      mesh,
      halfWidth,
      halfDepth,
      minY,
      maxY,
      roofHeight,
      extraSpeed,
      hit: false,
      horned: false,
    });
  }

  private spawnCollectible(kind: CollectibleKind, lane: LaneIndex, zPos: number, baseY: number): void {
    const mesh = createFiveCentCoinModel(this.textures);
    mesh.position.set(lane * GAME_CONSTANTS.LANE_WIDTH, baseY, zPos);
    this.scene.add(mesh);

    this.collectibles.push({
      id: this.nextEntityId++,
      kind,
      lane,
      mesh,
      baseY,
      phaseOffset: Math.random() * Math.PI * 2,
      collected: false,
    });
  }

  private spawnCoinLine(lane: LaneIndex, startZ: number, count: number, y: number): void {
    for (let i = 0; i < count; i++) {
      this.spawnCollectible('coin5c', lane, startZ - i * 2.2, y);
    }
  }

  private spawnCoinArc(lane: LaneIndex, centerZ: number): void {
    const offsets = [-3.0, -1.5, 0, 1.5, 3.0];
    const heights = [0.95, 1.65, 2.1, 1.65, 0.95];
    offsets.forEach((dz, i) => {
      this.spawnCollectible('coin5c', lane, centerZ + dz, heights[i]);
    });
  }

  private emitSparks(pos: THREE.Vector3, colorHex: number, count: number): void {
    const geo = new THREE.SphereGeometry(0.11, 6, 6);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo.clone(), mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      this.sparks.push({
        mesh,
        vel: new THREE.Vector3(
          Math.cos(angle) * (2.5 + Math.random() * 2.5),
          2.2 + Math.random() * 3.0,
          Math.sin(angle) * (2.5 + Math.random() * 2.5),
        ),
        life: 0.45,
      });
    }
    geo.dispose();
  }

  private setFeedback(text: string, tone: 'gold' | 'green' | 'red', duration = 1.4): void {
    this.feedbackText = text;
    this.feedbackTone = tone;
    this.feedbackSeq += 1;
    this.feedbackTimer = duration;
    this.pushHud(true);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;

      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.06);

      this.update(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private updateMacaws(dt: number, elapsed: number): void {
    for (const m of this.macaws) {
      m.rig.root.position.x = m.baseX + Math.sin(elapsed * 0.45 + m.phase) * 14;
      m.rig.root.position.y = m.baseY + Math.sin(elapsed * 1.4 + m.phase) * 0.7;
      m.rig.root.position.z += m.speed * dt;
      if (m.rig.root.position.z > 14) {
        m.rig.root.position.z = -95;
      }
      const flap = Math.sin(elapsed * 9.5 + m.phase) * 0.65;
      m.rig.leftWingPivot.rotation.z = flap;
      m.rig.rightWingPivot.rotation.z = -flap;
    }
  }

  private updateIntroCaptions(step: string): void {
    if (this.introLastStep === step) return;
    this.introLastStep = step;

    const captions: Record<string, IntroCaptionState> = {
      A: {
        step: 'A',
        speaker: 'Tegucigalpa · Centro Urbano',
        text: 'El protagonista camina distraído por las calles de Tegucigalpa entre comercios y tráfico.',
      },
      B: {
        step: 'B',
        speaker: 'Protagonista',
        text: '"¡Uy, disculpa!" Choca accidentalmente contra un automóvil estacionado en el bulevar.',
      },
      C: {
        step: 'C',
        speaker: 'Policía Municipal',
        text: 'Llega de inmediato un agente de la Policía Municipal alertado por el golpe.',
      },
      D: {
        step: 'D',
        speaker: 'Policía Municipal',
        text: '"Ciudadano, por causar este incidente le corresponde pagar la multa oficial."',
      },
      E: {
        step: 'E',
        speaker: 'Protagonista',
        text: '"¡No voy a pagar esa multa! ¡Fue solo un roce sin daños!"',
      },
      F: {
        step: 'F',
        speaker: 'Narrador',
        text: 'El protagonista da media vuelta y sale corriendo a toda velocidad por el asfalto.',
      },
      G: {
        step: 'G',
        speaker: 'Policía Municipal',
        text: '"¡Alto ahí! ¡No se escape!" Comienza una persecución policial por Tegucigalpa.',
      },
      H: {
        step: 'H',
        speaker: 'Persecución Activa',
        text: 'La cámara toma posición de carrera detrás del corredor entre buses y mototaxis.',
      },
      I: {
        step: 'I',
        speaker: '¡Toma el Control!',
        text: 'Esquiva el tráfico o salta encima de los autobuses y recoge monedas de 5 centavos.',
      },
    };

    this.introCaption = captions[step] ?? null;

    if (step === 'B') soundEngine.playCarBump();
    else if (step === 'C') soundEngine.playPoliceWhistle();
    else if (step === 'F') soundEngine.playJump();
    else if (step === 'G') {
      soundEngine.playPoliceWhistle();
      soundEngine.setMusicContext('chase');
    }

    this.pushHud(true);
  }

  private updateIntro(dt: number, elapsed: number): void {
    this.introTime += dt;
    const t = this.introTime;

    if (t < 2.4) {
      this.updateIntroCaptions('A');
      const p = t / 2.4;
      this.player.root.position.set(0, 0, THREE.MathUtils.lerp(2.2, -1.3, p));
      this.animateRunner(dt, 4.2, 0);
      this.player.headGroup.rotation.y = Math.sin(elapsed * 2.1) * 0.25;
      _camTargetPos.set(3.4, 2.0, 2.8);
      _camLookAt.set(0, 1.35, -1.6);
    } else if (t < 4.4) {
      this.updateIntroCaptions('B');
      const p = Math.min(1, (t - 2.4) / 0.9);
      this.player.root.position.set(0, 0, THREE.MathUtils.lerp(-1.3, -2.25, p));
      if (t > 2.85 && t < 3.45) {
        this.introCar.rotation.z = Math.sin((t - 2.85) * 30) * 0.06;
        this.player.bodyPivot.position.y = Math.abs(Math.sin((t - 2.85) * 14)) * 0.14;
      } else {
        this.introCar.rotation.z = 0;
        this.player.bodyPivot.position.y = 0;
      }
      this.player.leftBrow.position.y = 0.248;
      this.player.rightBrow.position.y = 0.248;
      this.player.mouthMesh.scale.set(0.85, 2.2, 1);
      this.animateRunner(dt, p < 0.7 ? 4.5 : 0, 0);
      _camTargetPos.set(3.6, 2.1, 1.0);
      _camLookAt.set(0, 1.15, -3.3);
    } else if (t < 6.6) {
      this.updateIntroCaptions('C');
      const p = Math.min(1, (t - 4.4) / 1.8);
      this.police.root.position.set(THREE.MathUtils.lerp(5.6, 1.5, p), 0, -2.2);
      this.police.root.rotation.y = Math.PI * 0.5;
      const walk = Math.sin(elapsed * 9) * 0.6;
      this.police.leftLegPivot.rotation.x = p < 1 ? walk : 0;
      this.police.rightLegPivot.rotation.x = p < 1 ? -walk : 0;
      this.animateRunner(dt, 0, 0);
      _camTargetPos.set(4.6, 2.25, 1.4);
      _camLookAt.set(0.8, 1.3, -2.2);
    } else if (t < 9.0) {
      this.updateIntroCaptions('D');
      this.police.ticketMesh.visible = true;
      this.police.rightArmPivot.rotation.x = -1.25 + Math.sin(elapsed * 6) * 0.14;
      this.player.root.rotation.y = -Math.PI * 0.45;
      this.player.leftBrow.rotation.z = -0.22;
      this.player.rightBrow.rotation.z = 0.22;
      this.animateRunner(dt, 0, 0);
      _camTargetPos.set(2.5, 1.95, 0.2);
      _camLookAt.set(0.65, 1.45, -2.2);
    } else if (t < 11.4) {
      this.updateIntroCaptions('E');
      this.player.headGroup.rotation.y = Math.sin(elapsed * 13) * 0.42;
      this.player.leftUpperArm.rotation.x = -1.15;
      this.player.rightUpperArm.rotation.x = -1.15;
      this.player.leftForearm.rotation.x = -0.6;
      this.player.rightForearm.rotation.x = -0.6;
      this.player.mouthMesh.scale.set(1.25, 1.4, 1);
      _camTargetPos.set(-2.3, 2.0, 0.2);
      _camLookAt.set(0.25, 1.45, -2.2);
    } else if (t < 13.4) {
      this.updateIntroCaptions('F');
      this.resetPlayerFacialExpression();
      this.player.headGroup.rotation.y = 0;
      this.player.root.rotation.y = 0;
      this.introCar.position.x = -4.2;
      this.scrollRoad(15 * dt);
      this.player.root.position.set(0, 0, 0);
      this.animateRunner(dt, 18, 0);
      _camTargetPos.set(2.6, 2.6, 4.2);
      _camLookAt.set(0, 1.35, -4);
    } else if (t < 15.6) {
      this.updateIntroCaptions('G');
      this.scrollRoad(17 * dt);
      this.animateRunner(dt, 18.5, 0);
      this.police.root.rotation.y = 0;
      this.police.root.position.set(0.4, 0, 3.0);
      const chaseSwing = Math.sin(elapsed * 15) * 0.92;
      this.police.leftLegPivot.rotation.x = chaseSwing;
      this.police.rightLegPivot.rotation.x = -chaseSwing;
      this.police.leftArmPivot.rotation.x = -chaseSwing;
      this.police.rightArmPivot.rotation.x = -0.8 + chaseSwing * 0.35;
      _camTargetPos.set(-2.4, 3.1, 6.0);
      _camLookAt.set(0, 1.35, -8);
    } else if (t < 17.2) {
      this.updateIntroCaptions('H');
      this.scrollRoad(17.5 * dt);
      this.animateRunner(dt, 18.5, 0);
      const chaseSwing = Math.sin(elapsed * 15) * 0.92;
      this.police.root.position.set(0.25, 0, 2.8);
      this.police.leftLegPivot.rotation.x = chaseSwing;
      this.police.rightLegPivot.rotation.x = -chaseSwing;
      _camTargetPos.set(0, 3.9, 6.8);
      _camLookAt.set(0, 1.35, -14);
    } else {
      this.updateIntroCaptions('I');
      this.onIntroComplete();
      this.startGame(true);
      return;
    }

    this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-5.2 * dt));
    this.camera.lookAt(_camLookAt);
  }

  private update(dt: number): void {
    const elapsed = this.clock.elapsedTime;
    this.updateMacaws(dt, elapsed);
    this.animateProceduralLandmarks(dt, elapsed);
    this.animateCityProps(elapsed);

    if (this.phase === 'menu') {
      this.scrollRoad(10.5 * dt);
      if (this.celebrateTimer > 0) {
        this.celebrateTimer = Math.max(0, this.celebrateTimer - dt);
        this.animateCelebration(dt, elapsed);
      } else {
        this.animateRunner(dt, 10.5, 0);
      }
      _camTargetPos.set(
        Math.sin(elapsed * 0.42) * 2.1 + 2.3,
        2.75 + Math.sin(elapsed * 0.35) * 0.2,
        5.6,
      );
      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-3 * dt));
      _camLookAt.set(0, 1.35, -3.5);
      this.camera.lookAt(_camLookAt);
      return;
    }

    if (this.phase === 'intro') {
      this.updateIntro(dt, elapsed);
      return;
    }

    if (this.phase === 'paused') {
      return;
    }

    if (this.phase === 'gameover') {
      this.fallProgress = Math.min(1, this.fallProgress + dt * 3.1);
      this.player.bodyPivot.rotation.x = -this.fallProgress * 1.42;
      this.player.bodyPivot.position.y = Math.max(0, 0.22 * (1 - this.fallProgress));
      this.player.torsoGroup.rotation.x = this.fallProgress * 0.35;
      return;
    }

    // Active Gameplay Update
    this.speed = Math.min(
      GAME_CONSTANTS.MAX_SPEED,
      this.speed + GAME_CONSTANTS.SPEED_RAMP_PER_SEC * dt,
    );

    const forwardStep = this.speed * dt;
    this.distance += forwardStep;
    this.score += forwardStep * (this.groundY > 0.5 ? 3.2 : 2.2); // Bonus points while surfing rooftops!

    if (this.feedbackTimer > 0) {
      this.feedbackTimer -= dt;
      if (this.feedbackTimer <= 0) {
        this.feedbackText = null;
        this.feedbackTone = null;
      }
    }

    if (this.landingTimer > 0) {
      this.landingTimer = Math.max(0, this.landingTimer - dt);
    }
    if (this.stumbleTimer > 0) {
      this.stumbleTimer = Math.max(0, this.stumbleTimer - dt);
    }

    if (this.invulnTimer > 0) {
      this.invulnTimer = Math.max(0, this.invulnTimer - dt);
      this.player.root.visible = Math.floor(this.invulnTimer * 16) % 2 === 0;
    } else {
      this.player.root.visible = true;
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }

    if (this.policeChaseTimer > 0) {
      this.policeChaseTimer = Math.max(0, this.policeChaseTimer - dt);
      this.police.root.visible = true;
      const chaseZ =
        this.policeChaseTimer > 1 ? 2.8 : THREE.MathUtils.lerp(6.8, 2.8, this.policeChaseTimer);
      this.police.root.position.set(this.playerX * 0.85, 0, chaseZ);
      const pSwing = Math.sin(elapsed * 15) * 0.95;
      this.police.leftLegPivot.rotation.x = pSwing;
      this.police.rightLegPivot.rotation.x = -pSwing;
      this.police.leftArmPivot.rotation.x = -pSwing;
      this.police.rightArmPivot.rotation.x = -0.9 + pSwing * 0.3;
    } else {
      this.police.root.visible = false;
    }

    const targetX = this.targetLane * GAME_CONSTANTS.LANE_WIDTH;
    const prevX = this.playerX;
    this.playerX = THREE.MathUtils.damp(this.playerX, targetX, 15, dt);
    const lateralVel = (this.playerX - prevX) / Math.max(dt, 0.001);

    // Move obstacles & check walkable rooftop support first
    let furthestZ = 0;
    let supportRoof: ActiveObstacle | null = null;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.mesh.position.z += (this.speed + obs.extraSpeed) * dt;
      if (obs.mesh.position.z < furthestZ) {
        furthestZ = obs.mesh.position.z;
      }

      // Natural diesel suspension heave & rotating wheels for moving Honduran vehicles
      if (obs.extraSpeed < 0) {
        const vehicleForwardSpeed = Math.abs(obs.extraSpeed);
        if (
          obs.kind === 'schoolBus' ||
          obs.kind === 'publicBus' ||
          obs.kind === 'decoratedBus' ||
          obs.kind === 'truck'
        ) {
          obs.mesh.position.y = Math.sin(elapsed * 7.8 + obs.id * 1.7) * 0.018;
        }
        obs.mesh.traverse((child) => {
          const r = child.userData?.wheelSpinRadius as number | undefined;
          if (r) {
            child.rotation.x += (vehicleForwardSpeed / r) * dt;
          }
        });
      }

      // Passing horn & diesel rumble for nearby buses/trucks
      if (
        !obs.horned &&
        obs.mesh.position.z > -10 &&
        obs.mesh.position.z < -2 &&
        (obs.kind === 'schoolBus' ||
          obs.kind === 'publicBus' ||
          obs.kind === 'decoratedBus' ||
          obs.kind === 'truck')
      ) {
        obs.horned = true;
        if (elapsed - this.lastHornTime > 4.2 && Math.random() < 0.45) {
          this.lastHornTime = elapsed;
          soundEngine.playVehiclePassHorn();
          soundEngine.playVehicleEngineRumble();
        }
      }

      // Walkable roof detection
      if (obs.roofHeight !== null) {
        const dx = Math.abs(obs.mesh.position.x - this.playerX);
        const dz = Math.abs(obs.mesh.position.z);
        if (dx < obs.halfWidth + 0.38 && dz < obs.halfDepth + 0.45) {
          if (this.playerY >= obs.roofHeight - 0.56) {
            if (!supportRoof || obs.roofHeight > (supportRoof.roofHeight ?? 0)) {
              supportRoof = obs;
            }
          }
        }
      }

      if (obs.mesh.position.z > 16) {
        this.disposeObjectTree(obs.mesh);
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
      }
    }

    const prevGroundY = this.groundY;
    this.groundY = supportRoof ? supportRoof.roofHeight ?? 0 : 0;

    // Detach cleanly into air if player ran off the end of a roof!
    if (this.isGrounded && this.groundY < prevGroundY - 0.1 && this.playerY > this.groundY + 0.05) {
      this.isGrounded = false;
      this.verticalVel = Math.min(this.verticalVel, -1.5);
    }

    // Apply gravity & rooftop landing detection
    if (!this.isGrounded) {
      this.playerY += this.verticalVel * dt;
      this.verticalVel -= GAME_CONSTANTS.GRAVITY * dt;
      if (this.playerY <= this.groundY) {
        const wasOnRoof = this.groundY > 0.5;
        this.playerY = this.groundY;
        this.verticalVel = 0;
        this.isGrounded = true;
        this.landingTimer = 0.22;
        soundEngine.playLand(wasOnRoof);

        if (wasOnRoof && supportRoof && this.activeRoofId !== supportRoof.id) {
          this.activeRoofId = supportRoof.id;
          this.score += 75;
          this.emitSparks(new THREE.Vector3(this.playerX, this.groundY + 0.08, 0), 0x38bdf8, 8);
          this.setFeedback('¡SOBRE EL TECHO! +75 PTS', 'gold', 1.1);
        } else if (!wasOnRoof) {
          this.activeRoofId = null;
        }
      }
    } else {
      this.playerY = this.groundY;
      if (supportRoof && this.activeRoofId !== supportRoof.id) {
        this.activeRoofId = supportRoof.id;
      } else if (!supportRoof) {
        this.activeRoofId = null;
      }
    }

    // Smart collision checks (distinguish walkable roofs, lateral scrapes, and front/hazard impacts!)
    for (const obs of this.obstacles) {
      if (obs.hit || this.invulnTimer > 0) continue;
      if (supportRoof && obs.id === supportRoof.id) continue; // Safely standing on this vehicle's roof!

      const dz = Math.abs(obs.mesh.position.z);
      const dx = Math.abs(obs.mesh.position.x - this.playerX);
      if (dz < obs.halfDepth + 0.28 && dx < obs.halfWidth + 0.28) {
        const playerMinY = this.playerY;
        const playerMaxY = this.playerY + (this.duckTimer > 0 ? 0.92 : 1.78);
        const topBlockingY = obs.roofHeight !== null ? obs.roofHeight - 0.56 : obs.maxY - 0.08;

        if (playerMaxY > obs.minY + 0.1 && playerMinY < topBlockingY) {
          // Check if this is a side scrape from switching lanes into the side wall of a long vehicle
          const isLateralScrape =
            obs.roofHeight !== null &&
            Math.abs(lateralVel) > 3.5 &&
            obs.mesh.position.z - obs.halfDepth + 0.7 < 0 &&
            obs.mesh.position.z + obs.halfDepth - 0.4 > 0;

          if (isLateralScrape) {
            this.targetLane = this.prevLane;
            this.invulnTimer = 0.75;
            this.stumbleTimer = 0.35;
            this.shakeTimer = 0.22;
            soundEngine.playStumble();
            this.setFeedback('¡ROCE LATERAL! MANTÉN EL CARRIL', 'red', 1.0);
          } else {
            obs.hit = true;
            this.handlePlayerHit();
          }
        }
      }
    }

    if (this.duckTimer > 0) {
      this.duckTimer = Math.max(0, this.duckTimer - dt);
    }

    const roofBounce =
      this.isGrounded && this.groundY > 0.5 ? Math.sin(elapsed * 26) * 0.025 : 0;

    this.player.root.position.set(this.playerX, 0, 0);
    this.player.bodyPivot.position.y = this.playerY + roofBounce;
    // Project shadow cleanly onto either the street or the bus roof beneath the player!
    this.player.shadowMesh.position.y = this.groundY + 0.03;
    this.player.shadowMesh.scale.setScalar(
      THREE.MathUtils.clamp(1 - Math.max(0, this.playerY - this.groundY) * 0.22, 0.45, 1),
    );

    this.animateRunner(dt, this.speed, lateralVel);

    // Metallic footsteps while running on bus/truck roof
    if (this.isGrounded && this.groundY > 0.5) {
      const stepIdx = Math.floor(this.runCycle / Math.PI);
      if (stepIdx !== this.lastStepPhase) {
        this.lastStepPhase = stepIdx;
        soundEngine.playRoofStep();
      }
    }

    this.scrollRoad(forwardStep);

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.mesh.position.z += forwardStep;
      col.mesh.rotation.y += dt * 3.4;
      col.mesh.position.y = col.baseY + Math.sin(elapsed * 4.5 + col.phaseOffset) * 0.12;

      if (col.mesh.position.z < furthestZ) {
        furthestZ = col.mesh.position.z;
      }

      if (!col.collected) {
        const dz = Math.abs(col.mesh.position.z);
        const dx = Math.abs(col.mesh.position.x - this.playerX);
        const playerMidY = this.playerY + (this.duckTimer > 0 ? 0.45 : 0.95);
        const dy = Math.abs(col.mesh.position.y - playerMidY);

        if (dz < 1.1 && dx < 1.1 && dy < 1.2) {
          col.collected = true;
          this.handleCollect(col);
          this.disposeObjectTree(col.mesh);
          this.scene.remove(col.mesh);
          this.collectibles.splice(i, 1);
          continue;
        }
      }

      if (col.mesh.position.z > 12) {
        this.disposeObjectTree(col.mesh);
        this.scene.remove(col.mesh);
        this.collectibles.splice(i, 1);
      }
    }

    while (furthestZ > -135) {
      const gap = THREE.MathUtils.clamp(
        30.5 - (this.speed - GAME_CONSTANTS.BASE_SPEED) * 0.24,
        24.5,
        30.5,
      );
      furthestZ -= gap;
      this.spawnPatternAt(furthestZ);
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.life -= dt;
      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        sp.mesh.geometry.dispose();
        (sp.mesh.material as THREE.Material).dispose();
        this.sparks.splice(i, 1);
      } else {
        sp.mesh.position.addScaledVector(sp.vel, dt);
        sp.vel.y -= 10 * dt;
        (sp.mesh.material as THREE.MeshBasicMaterial).opacity = sp.life / 0.45;
      }
    }

    const targetFov =
      54 +
      ((this.speed - GAME_CONSTANTS.BASE_SPEED) /
        (GAME_CONSTANTS.MAX_SPEED - GAME_CONSTANTS.BASE_SPEED)) *
        8;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 4, dt);
    this.camera.updateProjectionMatrix();

    const shakeX =
      this.shakeTimer > 0 ? (Math.random() - 0.5) * 0.45 * (this.shakeTimer / 0.35) : 0;
    const shakeY =
      this.shakeTimer > 0 ? (Math.random() - 0.5) * 0.35 * (this.shakeTimer / 0.35) : 0;

    // Adaptive rooftop camera smoothly raises when surfing buses/trucks!
    const roofLift = Math.max(0, this.groundY) * 0.85;
    const airLift = Math.max(0, this.playerY - this.groundY) * 0.38;

    _camTargetPos.set(this.playerX * 0.65 + shakeX, 3.85 + roofLift + airLift + shakeY, 6.9);
    this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-8 * dt));
    _camLookAt.set(
      this.playerX * 0.5,
      1.35 + Math.max(0, this.groundY) * 0.72 + airLift * 0.55,
      -14,
    );
    this.camera.lookAt(_camLookAt);

    if (elapsed - this.lastHudPush >= 0.06) {
      this.pushHud(false);
      this.lastHudPush = elapsed;
    }
  }

  private rebuildProceduralLandmarks(): void {
    for (const lm of this.proceduralLandmarks) {
      this.disposeObjectTree(lm);
      this.scene.remove(lm);
    }
    this.proceduralLandmarks = [];
    this.landmarkSpawnSeq = 0;

    const spacing = 54;
    for (let i = 0; i < 4; i++) {
      const built = createCityLandmarkMonument(
        this.cityId,
        this.textures,
        this.landmarkSpawnSeq++,
      );
      built.mesh.position.set(built.preferredSide * built.offsetX, 0, -28 - i * spacing);
      this.proceduralLandmarks.push(built.mesh);
      this.scene.add(built.mesh);
    }
  }

  private scrollRoad(deltaZ: number): void {
    const totalSpan = SEGMENT_COUNT * SEGMENT_LENGTH;
    for (const seg of this.roadSegments) {
      seg.position.z += deltaZ;
      if (seg.position.z > SEGMENT_LENGTH + 6) {
        seg.position.z -= totalSpan;
      }
    }

    const landmarkSpan = 54 * 4;
    for (let i = 0; i < this.proceduralLandmarks.length; i++) {
      const lm = this.proceduralLandmarks[i];
      lm.position.z += deltaZ;
      if (lm.position.z > 28) {
        const nextZ = lm.position.z - landmarkSpan;
        this.disposeObjectTree(lm);
        this.scene.remove(lm);

        const built = createCityLandmarkMonument(
          this.cityId,
          this.textures,
          this.landmarkSpawnSeq++,
        );
        built.mesh.position.set(built.preferredSide * built.offsetX, 0, nextZ);
        this.proceduralLandmarks[i] = built.mesh;
        this.scene.add(built.mesh);
      }
    }
  }

  private animateCityProps(elapsed: number): void {
    for (const seg of this.roadSegments) {
      seg.traverse((obj) => {
        const phase = obj.userData?.laundryPhase as number | undefined;
        if (phase !== undefined) {
          obj.rotation.z = Math.sin(elapsed * 2.4 + phase) * 0.14 + Math.sin(elapsed * 4.1 + phase * 0.7) * 0.04;
        }
      });
    }
  }

  private animateProceduralLandmarks(dt: number, elapsed: number): void {
    for (const lm of this.proceduralLandmarks) {
      lm.traverse((obj) => {
        const spinSpeed = obj.userData?.spinSpeed as number | undefined;
        if (spinSpeed) {
          if (obj.userData.spinAxis === 'z') {
            obj.rotation.z += spinSpeed * dt;
          } else {
            obj.rotation.y += spinSpeed * dt;
          }
        }
        const bobPhase = obj.userData?.bobPhase as number | undefined;
        if (bobPhase !== undefined) {
          const baseY = (obj.userData.bobBaseY as number | undefined) ?? obj.position.y;
          obj.userData.bobBaseY = baseY;
          obj.position.y = baseY + Math.sin(elapsed * 1.45 + bobPhase) * 0.16;
          obj.rotation.z = Math.sin(elapsed * 1.1 + bobPhase) * 0.028;
        }
      });
    }
  }

  private animateCelebration(dt: number, elapsed: number): void {
    const hop = Math.abs(Math.sin(elapsed * 8.5)) * 0.32;
    this.player.bodyPivot.position.y = THREE.MathUtils.damp(this.player.bodyPivot.position.y, hop, 16, dt);
    this.player.leftUpperArm.rotation.x = -2.35 + Math.sin(elapsed * 11) * 0.25;
    this.player.rightUpperArm.rotation.x = -2.35 - Math.sin(elapsed * 11) * 0.25;
    this.player.leftForearm.rotation.x = -0.35;
    this.player.rightForearm.rotation.x = -0.35;
    this.player.leftThigh.rotation.x = Math.sin(elapsed * 8.5) * 0.25;
    this.player.rightThigh.rotation.x = -Math.sin(elapsed * 8.5) * 0.25;
    this.player.leftShin.rotation.x = 0.25;
    this.player.rightShin.rotation.x = 0.25;
  }

  private animateRunner(dt: number, runSpeed: number, lateralVel: number): void {
    const isDucking = this.duckTimer > 0;
    const isLanding = this.landingTimer > 0;
    this.runCycle += dt * (runSpeed * 0.68);

    const targetScaleY = isDucking ? 0.56 : isLanding ? 0.84 : 1.0;
    const targetScaleXZ = isDucking ? 1.1 : isLanding ? 1.06 : 1.0;
    this.player.bodyPivot.scale.y = THREE.MathUtils.damp(
      this.player.bodyPivot.scale.y,
      targetScaleY,
      20,
      dt,
    );
    this.player.bodyPivot.scale.x = THREE.MathUtils.damp(
      this.player.bodyPivot.scale.x,
      targetScaleXZ,
      20,
      dt,
    );
    this.player.bodyPivot.scale.z = THREE.MathUtils.damp(
      this.player.bodyPivot.scale.z,
      targetScaleXZ,
      20,
      dt,
    );

    const stumbleRoll = this.stumbleTimer > 0 ? Math.sin(this.stumbleTimer * 35) * 0.25 : 0;
    const targetRoll = THREE.MathUtils.clamp(-lateralVel * 0.03 + stumbleRoll, -0.34, 0.34);
    this.player.bodyPivot.rotation.z = THREE.MathUtils.damp(
      this.player.bodyPivot.rotation.z,
      targetRoll,
      14,
      dt,
    );

    if (!this.isGrounded) {
      this.player.leftThigh.rotation.x = THREE.MathUtils.damp(this.player.leftThigh.rotation.x, 0.72, 12, dt);
      this.player.leftShin.rotation.x = THREE.MathUtils.damp(this.player.leftShin.rotation.x, -0.95, 12, dt);
      this.player.rightThigh.rotation.x = THREE.MathUtils.damp(this.player.rightThigh.rotation.x, -0.45, 12, dt);
      this.player.rightShin.rotation.x = THREE.MathUtils.damp(this.player.rightShin.rotation.x, -0.35, 12, dt);

      this.player.leftUpperArm.rotation.x = THREE.MathUtils.damp(this.player.leftUpperArm.rotation.x, -0.85, 12, dt);
      this.player.rightUpperArm.rotation.x = THREE.MathUtils.damp(this.player.rightUpperArm.rotation.x, 0.55, 12, dt);
      this.player.leftForearm.rotation.x = THREE.MathUtils.damp(this.player.leftForearm.rotation.x, -0.75, 12, dt);
      this.player.rightForearm.rotation.x = THREE.MathUtils.damp(this.player.rightForearm.rotation.x, -0.65, 12, dt);
      this.player.torsoGroup.rotation.x = THREE.MathUtils.damp(this.player.torsoGroup.rotation.x, 0.12, 12, dt);
    } else if (isDucking) {
      this.player.torsoGroup.rotation.x = THREE.MathUtils.damp(this.player.torsoGroup.rotation.x, 0.5, 18, dt);
      this.player.leftThigh.rotation.x = THREE.MathUtils.damp(this.player.leftThigh.rotation.x, -0.55, 18, dt);
      this.player.rightThigh.rotation.x = THREE.MathUtils.damp(this.player.rightThigh.rotation.x, 0.55, 18, dt);
      this.player.leftShin.rotation.x = THREE.MathUtils.damp(this.player.leftShin.rotation.x, -0.7, 18, dt);
      this.player.rightShin.rotation.x = THREE.MathUtils.damp(this.player.rightShin.rotation.x, -0.7, 18, dt);
      this.player.leftUpperArm.rotation.x = THREE.MathUtils.damp(this.player.leftUpperArm.rotation.x, 0.7, 18, dt);
      this.player.rightUpperArm.rotation.x = THREE.MathUtils.damp(this.player.rightUpperArm.rotation.x, 0.7, 18, dt);
      this.player.leftForearm.rotation.x = THREE.MathUtils.damp(this.player.leftForearm.rotation.x, -0.9, 18, dt);
      this.player.rightForearm.rotation.x = THREE.MathUtils.damp(this.player.rightForearm.rotation.x, -0.9, 18, dt);
    } else if (isLanding) {
      this.player.torsoGroup.rotation.x = THREE.MathUtils.damp(this.player.torsoGroup.rotation.x, 0.25, 22, dt);
      this.player.leftThigh.rotation.x = THREE.MathUtils.damp(this.player.leftThigh.rotation.x, 0.35, 22, dt);
      this.player.rightThigh.rotation.x = THREE.MathUtils.damp(this.player.rightThigh.rotation.x, 0.25, 22, dt);
      this.player.leftShin.rotation.x = THREE.MathUtils.damp(this.player.leftShin.rotation.x, -0.85, 22, dt);
      this.player.rightShin.rotation.x = THREE.MathUtils.damp(this.player.rightShin.rotation.x, -0.75, 22, dt);
      this.player.leftUpperArm.rotation.x = THREE.MathUtils.damp(this.player.leftUpperArm.rotation.x, -0.35, 20, dt);
      this.player.rightUpperArm.rotation.x = THREE.MathUtils.damp(this.player.rightUpperArm.rotation.x, -0.35, 20, dt);
    } else if (runSpeed <= 0.1) {
      this.player.leftThigh.rotation.x = THREE.MathUtils.damp(this.player.leftThigh.rotation.x, 0, 12, dt);
      this.player.rightThigh.rotation.x = THREE.MathUtils.damp(this.player.rightThigh.rotation.x, 0, 12, dt);
      this.player.leftShin.rotation.x = THREE.MathUtils.damp(this.player.leftShin.rotation.x, 0, 12, dt);
      this.player.rightShin.rotation.x = THREE.MathUtils.damp(this.player.rightShin.rotation.x, 0, 12, dt);
      this.player.leftUpperArm.rotation.x = THREE.MathUtils.damp(this.player.leftUpperArm.rotation.x, 0, 12, dt);
      this.player.rightUpperArm.rotation.x = THREE.MathUtils.damp(this.player.rightUpperArm.rotation.x, 0, 12, dt);
      this.player.leftForearm.rotation.x = THREE.MathUtils.damp(this.player.leftForearm.rotation.x, -0.18, 12, dt);
      this.player.rightForearm.rotation.x = THREE.MathUtils.damp(this.player.rightForearm.rotation.x, -0.18, 12, dt);
      this.player.torsoGroup.rotation.x = THREE.MathUtils.damp(this.player.torsoGroup.rotation.x, 0, 12, dt);
      this.player.torsoGroup.position.y = 0.88;
    } else {
      const strideAmp = runSpeed < 7 ? 0.52 : 0.92;
      const swing = Math.sin(this.runCycle) * strideAmp;
      this.player.leftThigh.rotation.x = swing;
      this.player.rightThigh.rotation.x = -swing;

      this.player.leftShin.rotation.x = -Math.max(0, Math.sin(this.runCycle + 0.55)) * 1.12;
      this.player.rightShin.rotation.x = -Math.max(0, -Math.sin(this.runCycle + 0.55)) * 1.12;

      this.player.leftUpperArm.rotation.x = -swing * 0.82;
      this.player.rightUpperArm.rotation.x = swing * 0.82;
      this.player.leftForearm.rotation.x = -0.88 + Math.max(0, -swing) * 0.25;
      this.player.rightForearm.rotation.x = -0.88 + Math.max(0, swing) * 0.25;

      this.player.torsoGroup.rotation.x = THREE.MathUtils.damp(
        this.player.torsoGroup.rotation.x,
        runSpeed < 7 ? 0.04 : 0.14,
        12,
        dt,
      );
      this.player.torsoGroup.position.y = 0.88 + Math.abs(Math.sin(this.runCycle)) * 0.055;
    }
  }

  private handleCollect(col: ActiveCollectible): void {
    this.runCoins += 1;
    this.score += GAME_CONSTANTS.COIN_SCORE;
    soundEngine.playCoin();
    this.emitSparks(col.mesh.position, 0xfacc15, 7);

    if (this.score > this.highScore) {
      this.highScore = Math.floor(this.score);
    }
    this.pushHud(true);
  }

  private handlePlayerHit(): void {
    this.lives -= 1;
    this.shakeTimer = 0.36;
    this.emitSparks(new THREE.Vector3(this.playerX, this.playerY + 1.0, 0), 0xef4444, 10);

    if (this.lives <= 0) {
      this.lives = 0;
      this.phase = 'gameover';
      this.fallProgress = 0;
      this.player.root.visible = true;
      this.police.root.visible = true;
      this.police.root.position.set(this.playerX + 0.72, 0, 1.45);
      soundEngine.stopMusic();
      soundEngine.playGameOver();
      soundEngine.playPoliceWhistle();

      const roundedScore = Math.floor(this.score);
      if (roundedScore > this.highScore) {
        this.highScore = roundedScore;
      }
      this.onRunComplete({
        score: roundedScore,
        distance: Math.floor(this.distance),
        coins: this.runCoins,
        city: this.cityId,
      });
      this.pushHud(true);
    } else {
      this.invulnTimer = GAME_CONSTANTS.INVULN_DURATION;
      this.policeChaseTimer = 2.8;
      this.speed = Math.max(GAME_CONSTANTS.BASE_SPEED, this.speed - 3.5);
      soundEngine.playCrash();
      soundEngine.playPoliceWhistle();
      this.setFeedback(
        `¡IMPACTO EN LA RUTA! ${this.lives} ${this.lives === 1 ? 'VIDA RESTANTE' : 'VIDAS RESTANTES'}`,
        'red',
      );
    }
  }

  private pushHud(force: boolean): void {
    const roundedScore = Math.floor(this.score);
    if (roundedScore > this.highScore) {
      this.highScore = roundedScore;
    }
    if (force) {
      this.lastHudPush = this.clock.elapsedTime;
    }
    this.onHudUpdate({
      phase: this.phase,
      city: this.cityId,
      score: roundedScore,
      highScore: Math.floor(this.highScore),
      distance: Math.floor(this.distance),
      runCoins: this.runCoins,
      lives: this.lives,
      maxLives: GAME_CONSTANTS.MAX_LIVES,
      speedKmh: Math.round(this.speed * 3.1),
      onVehicleRoof: this.isGrounded && this.groundY > 0.5,
      feedbackText: this.feedbackText,
      feedbackTone: this.feedbackTone,
      feedbackSeq: this.feedbackSeq,
      introCaption: this.introCaption,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    soundEngine.stopMusic();
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.clearDynamicEntities();
    this.disposeObjectTree(this.scene);
    this.pmremEnvTex.dispose();
    this.textures.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

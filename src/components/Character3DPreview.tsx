import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RotateCw, Sparkles } from 'lucide-react';
import { createRealisticHumanCharacter, type CharacterBuildOptions, type PlayerRig } from '../game/models';

interface Character3DPreviewProps {
  characterOptions: CharacterBuildOptions;
  label: string;
  subtitle?: string;
}

const isSoftwareWebGl = (): boolean => {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
};

function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = mesh.material;
    if (Array.isArray(mat)) {
      mat.forEach((m) => {
        const std = m as THREE.MeshStandardMaterial;
        std.map?.dispose();
        std.dispose();
      });
    } else if (mat) {
      const std = mat as THREE.MeshStandardMaterial;
      std.map?.dispose();
      std.dispose();
    }
  });
}

export function Character3DPreview({ characterOptions, label, subtitle }: Character3DPreviewProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const celebrateTimerRef = useRef(0);
  const userYawRef = useRef(0.32);
  const autoSpinRef = useRef(true);
  const [autoSpin, setAutoSpin] = useState(true);
  const dragRef = useRef<{ active: boolean; lastX: number }>({ active: false, lastX: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const softwareGl = isSoftwareWebGl();
    const width = Math.max(240, mount.clientWidth || 300);
    const height = Math.max(220, mount.clientHeight || 260);

    const renderer = new THREE.WebGLRenderer({
      antialias: !softwareGl,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(softwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !softwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1628);
    scene.fog = new THREE.Fog(0x0b1628, 6.5, 14);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 25);
    camera.position.set(0, 1.18, 3.05);
    camera.lookAt(0, 0.96, 0);

    // 3-point warm/cool studio lighting
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.9);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffe7c7, 2.1);
    keyLight.position.set(2.4, 3.8, 2.8);
    keyLight.castShadow = !softwareGl;
    keyLight.shadow.mapSize.set(512, 512);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 10;
    keyLight.shadow.camera.left = -1.6;
    keyLight.shadow.camera.right = 1.6;
    keyLight.shadow.camera.top = 2.4;
    keyLight.shadow.camera.bottom = -0.5;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.05);
    rimLight.position.set(-2.2, 2.4, -2.5);
    scene.add(rimLight);

    // Studio turntable pedestal
    const stageGroup = new THREE.Group();
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 1.02, 0.12, 36),
      new THREE.MeshStandardMaterial({ color: 0x132238, roughness: 0.48, metalness: 0.35 }),
    );
    plinth.position.y = -0.06;
    plinth.receiveShadow = true;
    stageGroup.add(plinth);

    const plinthRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.93, 0.014, 10, 40),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.78 }),
    );
    plinthRing.rotation.x = Math.PI / 2;
    plinthRing.position.y = 0.002;
    stageGroup.add(plinthRing);
    scene.add(stageGroup);

    const rig: PlayerRig = createRealisticHumanCharacter(characterOptions);
    // Character faces -Z in gameplay; rotate PI so she faces camera +Z initially
    rig.root.rotation.y = Math.PI + userYawRef.current;
    scene.add(rig.root);

    let frameId = 0;
    let disposed = false;
    let prevTime = performance.now();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const onResize = () => {
      if (!mount || disposed) return;
      const w = Math.max(200, mount.clientWidth);
      const h = Math.max(200, mount.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObs = new ResizeObserver(onResize);
    resizeObs.observe(mount);

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - prevTime) / 1000));
      prevTime = now;
      const t = now * 0.001;

      if (autoSpinRef.current && !dragRef.current.active) {
        userYawRef.current += dt * 0.55;
      }
      rig.root.rotation.y = Math.PI + userYawRef.current;

      if (celebrateTimerRef.current > 0) {
        celebrateTimerRef.current = Math.max(0, celebrateTimerRef.current - dt);
        const phase = t * 8;
        rig.bodyPivot.position.y = Math.abs(Math.sin(phase)) * 0.14;
        rig.leftUpperArm.rotation.x = -2.4 + Math.sin(phase) * 0.25;
        rig.rightUpperArm.rotation.x = -2.4 - Math.sin(phase) * 0.25;
        rig.leftUpperArm.rotation.z = 0.28;
        rig.rightUpperArm.rotation.z = -0.28;
        rig.mouthMesh.scale.set(1.3, 1.7, 1);
      } else {
        // Gentle confident breathing & light step idle
        rig.bodyPivot.position.y = Math.sin(t * 2.2) * 0.012;
        rig.leftUpperArm.rotation.x = Math.sin(t * 2.2) * 0.08;
        rig.rightUpperArm.rotation.x = -Math.sin(t * 2.2) * 0.08;
        rig.leftUpperArm.rotation.z = 0.06;
        rig.rightUpperArm.rotation.z = -0.06;
        rig.leftForearm.rotation.x = -0.22;
        rig.rightForearm.rotation.x = -0.22;
        rig.leftThigh.rotation.x = 0.04;
        rig.rightThigh.rotation.x = -0.04;
        rig.mouthMesh.scale.set(1.05, 1.15, 1);
      }

      renderer.render(scene, camera);
      if (softwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    if (!softwareGl) {
      renderer.compile(scene, camera);
    }
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObs.disconnect();
      disposeObject3D(rig.root);
      disposeObject3D(stageGroup);
      envTarget.dispose();
      renderer.dispose();
      mount.innerHTML = '';
    };
  }, [
    characterOptions.characterId,
    characterOptions.outfitId,
    characterOptions.shoeId,
    characterOptions.hatId,
    characterOptions.backpackId,
    characterOptions.accessoryId,
  ]);

  return (
    <div className="relative rounded-xl bg-[#0b1628] border border-sky-400/25 overflow-hidden">
      <div
        ref={mountRef}
        onPointerDown={(e) => {
          dragRef.current = { active: true, lastX: e.clientX };
        }}
        onPointerMove={(e) => {
          if (!dragRef.current.active) return;
          const dx = e.clientX - dragRef.current.lastX;
          dragRef.current.lastX = e.clientX;
          userYawRef.current += dx * 0.014;
        }}
        onPointerUp={() => {
          dragRef.current.active = false;
        }}
        onPointerLeave={() => {
          dragRef.current.active = false;
        }}
        className="w-full h-[220px] sm:h-[250px] cursor-grab active:cursor-grabbing touch-none"
      />

      <div className="absolute top-2.5 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
        <div className="bg-[#091220]/90 border border-white/15 rounded-lg px-2.5 py-1.5 max-w-[70%]">
          <div className="text-xs font-extrabold text-white truncate">{label}</div>
          {subtitle && <div className="text-[10px] text-sky-300 truncate">{subtitle}</div>}
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              autoSpinRef.current = !autoSpinRef.current;
              setAutoSpin(autoSpinRef.current);
            }}
            title="Activar/pausar giro 360°"
            className={`min-h-[32px] px-2.5 py-1 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
              autoSpin
                ? 'bg-sky-500/20 border-sky-400/40 text-sky-200'
                : 'bg-[#091220]/90 border-white/15 text-slate-300'
            }`}
          >
            <RotateCw className="w-3 h-3" />
            <span className="hidden sm:inline">360°</span>
          </button>

          <button
            type="button"
            onClick={() => {
              celebrateTimerRef.current = 1.6;
            }}
            className="min-h-[32px] px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>Celebrar</span>
          </button>
        </div>
      </div>

      <div className="px-3 py-1.5 bg-[#091220]/95 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300">
        <span>Arrastra horizontalmente para girar el modelo 3D</span>
        <span className="text-sky-300 font-semibold">Activo PBR Tiempo Real</span>
      </div>
    </div>
  );
}

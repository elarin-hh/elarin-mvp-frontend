export type MediaPipePoseModules = {
  Camera: any;
  drawConnectors: any;
  drawLandmarks: any;
  Pose: any;
  POSE_CONNECTIONS: any;
};

type ScriptDefinition = {
  name: string;
  src: string;
  integrity: string;
};

export const MEDIAPIPE_VERSIONS = {
  pose: '0.5.1675469404',
  camera: '0.3.1675466862',
  drawing: '0.3.1675466124'
};

const MEDIAPIPE_CDN_BASE = 'https://cdn.jsdelivr.net/npm';
const MEDIAPIPE_POSE_BASE = `${MEDIAPIPE_CDN_BASE}/@mediapipe/pose@${MEDIAPIPE_VERSIONS.pose}`;
const SCRIPT_LOAD_TIMEOUT_MS = 12000;

const MEDIAPIPE_SCRIPTS: ScriptDefinition[] = [
  {
    name: `MediaPipe Camera Utils v${MEDIAPIPE_VERSIONS.camera}`,
    src: `${MEDIAPIPE_CDN_BASE}/@mediapipe/camera_utils@${MEDIAPIPE_VERSIONS.camera}/camera_utils.js`,
    integrity: 'sha384-q1KhAZhJcJXr3zfC3Tz07pBqQSabwFIZhXlmlUAB8s0zk4ETWERkIKGBCFQ5Jc3e'
  },
  {
    name: `MediaPipe Drawing Utils v${MEDIAPIPE_VERSIONS.drawing}`,
    src: `${MEDIAPIPE_CDN_BASE}/@mediapipe/drawing_utils@${MEDIAPIPE_VERSIONS.drawing}/drawing_utils.js`,
    integrity: 'sha384-W/7NVG2tfN12ld8faSFVOZ/W4UHFHze98GqEUPTl8EjY9QDwCKQIzoCHp8/IlIIr'
  },
  {
    name: `MediaPipe Pose v${MEDIAPIPE_VERSIONS.pose}`,
    src: `${MEDIAPIPE_POSE_BASE}/pose.js`,
    integrity: 'sha384-qcJQ+n/ZcF15Xu2EoRupB4Av+GEAGeW0Td1mp2A90u0NdNLzLYQVMUq1Ax1YAHqk'
  }
];

const ALLOWED_POSE_ASSETS = new Set([
  'pose_solution_packed_assets_loader.js',
  'pose_solution_packed_assets.data',
  'pose_solution_simd_wasm_bin.data',
  'pose_solution_simd_wasm_bin.js',
  'pose_solution_simd_wasm_bin.wasm',
  'pose_solution_wasm_bin.js',
  'pose_solution_wasm_bin.wasm',
  'pose_landmark_full.tflite',
  'pose_landmark_heavy.tflite',
  'pose_landmark_lite.tflite',
  'pose_web.binarypb',
  'pose.js'
]);

const waitFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function loadScript({ src, name, integrity }: ScriptDefinition): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!integrity) {
      reject(new Error(`Integridade ausente para ${name}`));
      return;
    }

    const existingScript = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existingScript) {
      if (existingScript.integrity && existingScript.integrity === integrity) {
        resolve();
      } else {
        reject(new Error(`Integridade inválida ou ausente para ${name}`));
      }
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.integrity = integrity;
    script.referrerPolicy = 'no-referrer';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Falha ao carregar ${name}: ${src}`));
    document.head.appendChild(script);
  });
}

async function loadScriptWithTimeout(def: ScriptDefinition): Promise<void> {
  const timeoutError = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout ao carregar ${def.name}`)), SCRIPT_LOAD_TIMEOUT_MS)
  );
  return Promise.race([loadScript(def), timeoutError]);
}

async function waitForGlobal(globalName: string, timeout = 10000): Promise<unknown> {
  const startTime = Date.now();
  type WindowGlobals = typeof window & Record<string, unknown>;
  const globalScope = window as WindowGlobals;
  while (!globalScope[globalName]) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Timeout aguardando ${globalName}`);
    }
    await waitFor(100);
  }
  return globalScope[globalName];
}

export async function loadPoseModules(): Promise<MediaPipePoseModules> {
  await Promise.all(MEDIAPIPE_SCRIPTS.map((scriptDef) => loadScriptWithTimeout(scriptDef)));

  const [Camera, drawConnectors, drawLandmarks, Pose, POSE_CONNECTIONS] = (await Promise.all([
    waitForGlobal('Camera'),
    waitForGlobal('drawConnectors'),
    waitForGlobal('drawLandmarks'),
    waitForGlobal('Pose'),
    waitForGlobal('POSE_CONNECTIONS')
  ])) as [any, any, any, any, any];

  return { Camera, drawConnectors, drawLandmarks, Pose, POSE_CONNECTIONS };
}

export function getPoseAssetUrl(file: string): string {
  if (!ALLOWED_POSE_ASSETS.has(file)) {
    throw new Error(`Asset MediaPipe não permitido: ${file}`);
  }
  return `${MEDIAPIPE_POSE_BASE}/${file}`;
}

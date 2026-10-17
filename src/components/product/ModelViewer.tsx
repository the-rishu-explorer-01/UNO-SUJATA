import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

type Status = "idle" | "loading" | "ready" | "error";
interface Controls {
  reset: () => void;
  fit: () => void;
  zoom: (inward: boolean) => void;
}

/**
 * 3D viewer for binary glTF (GLB) models. Three.js is loaded only when the visitor asks for the viewer,
 * so the page does not download it up front.
 *
 * For visual inspection only. The viewer does not measure, and it does not make a model a dimensioned drawing.
 */
export default function ModelViewer({ url, title }: { url: string; title: string }) {
  const mount = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<Controls | null>(null);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !mount.current) return;
    const el = mount.current;
    let cancelled = false;
    let dispose: (() => void) | null = null;
    setStatus("loading");
    setError(null);

    (async () => {
      try {
        const THREE = await import("three");
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
        if (cancelled) return;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        el.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        // An environment map gives metal surfaces something to reflect. Without it, brass looks flat.
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = envTexture;
        const key = new THREE.DirectionalLight(0xffffff, 1.1);
        key.position.set(3, 5, 4);
        scene.add(key);

        const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.screenSpacePanning = false;

        let model: import("three").Object3D | null = null;
        let home = { pos: new THREE.Vector3(0, 0, 3), target: new THREE.Vector3() };

        const resize = () => {
          const w = el.clientWidth || 1;
          const h = el.clientHeight || 1;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        const ro = new ResizeObserver(resize);
        ro.observe(el);
        resize();

        const fit = () => {
          if (!model) return;
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center);
          const largest = Math.max(size.x, size.y, size.z) || 1;
          const distance = (largest / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 1.6;
          camera.near = distance / 100;
          camera.far = distance * 100;
          camera.updateProjectionMatrix();
          home = { pos: new THREE.Vector3(distance * 0.6, distance * 0.4, distance), target: new THREE.Vector3() };
          camera.position.copy(home.pos);
          controls.target.copy(home.target);
          controls.update();
        };

        let frame = 0;
        const tick = () => {
          frame = requestAnimationFrame(tick);
          controls.update();
          renderer.render(scene, camera);
        };

        controlsRef.current = {
          reset: () => {
            camera.position.copy(home.pos);
            controls.target.copy(home.target);
            controls.update();
          },
          fit,
          zoom: (inward) => (inward ? controls.dollyIn(1.25) : controls.dollyOut(1.25)),
        };

        dispose = () => {
          cancelAnimationFrame(frame);
          ro.disconnect();
          controls.dispose();
          scene.traverse((o) => {
            const m = o as { geometry?: { dispose: () => void }; material?: { dispose: () => void } | { dispose: () => void }[] };
            m.geometry?.dispose();
            if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose());
            else m.material?.dispose();
          });
          envTexture.dispose();
          pmrem.dispose();
          renderer.dispose();
          if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
          controlsRef.current = null;
        };

        new GLTFLoader().load(
          url,
          (gltf) => {
            if (cancelled) {
              gltf.scene.traverse((o) => {
                const m = o as { geometry?: { dispose: () => void } };
                m.geometry?.dispose();
              });
              return;
            }
            model = gltf.scene;
            scene.add(model);
            fit();
            tick();
            setStatus("ready");
          },
          undefined,
          () => {
            if (cancelled) return;
            setStatus("error");
            setError("This model could not be displayed. The file may be damaged or in a format this viewer does not support.");
          }
        );
      } catch {
        if (!cancelled) {
          setStatus("error");
          setError("The 3D viewer could not start on this device. Your browser may not support WebGL.");
        }
      }
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [active, url]);

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        className="flex w-full items-center justify-between border border-ink/30 bg-paper px-5 py-4 font-body text-sm font-semibold transition-colors duration-200 hover:border-ink"
      >
        <span>Load 3D view: {title}</span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink/65">Interactive</span>
      </button>
    );
  }

  const ready = status === "ready";
  return (
    <figure className="space-y-3">
      <div className="relative aspect-[4/3] w-full touch-none overflow-hidden border border-line bg-bone sm:aspect-[16/10]">
        <div ref={mount} className="absolute inset-0" role="img" aria-label={`3D model of ${title}. Drag to rotate, scroll or pinch to zoom.`} />
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 font-body text-sm text-ink/70" role="status">
            <Loader2 size={18} className="animate-spin" aria-hidden="true" /> Loading 3D model…
          </div>
        )}
        {status === "error" && (
          <div role="alert" className="absolute inset-0 flex items-center justify-center p-6 text-center font-body text-sm text-red-900">
            {error}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="3D view controls">
        <ViewerButton label="Zoom in" disabled={!ready} onClick={() => controlsRef.current?.zoom(true)} icon={<ZoomIn size={16} aria-hidden="true" />} />
        <ViewerButton label="Zoom out" disabled={!ready} onClick={() => controlsRef.current?.zoom(false)} icon={<ZoomOut size={16} aria-hidden="true" />} />
        <ViewerButton label="Fit to screen" disabled={!ready} onClick={() => controlsRef.current?.fit()} icon={<Maximize2 size={16} aria-hidden="true" />} />
        <ViewerButton label="Reset view" disabled={!ready} onClick={() => controlsRef.current?.reset()} icon={<RotateCcw size={16} aria-hidden="true" />} />
      </div>

      <figcaption className="font-body text-xs leading-relaxed text-ink/70">
        For visual inspection only. The viewer does not measure the part, and this model is not a dimensioned drawing. Use the approved drawing for manufacturing.
      </figcaption>
    </figure>
  );
}

function ViewerButton({ label, icon, onClick, disabled }: { label: string; icon: ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex min-h-10 items-center gap-2 border border-ink/30 px-3 font-body text-xs font-semibold hover:border-ink disabled:opacity-40">
      {icon} {label}
    </button>
  );
}

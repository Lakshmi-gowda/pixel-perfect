import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Box3, CatmullRomCurve3, Color, Group, Mesh, MeshStandardMaterial, Raycaster, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { vesselIds, type VesselId } from "@/api/types";
import { vesselCurves } from "@/config/vesselCurves";
import { riskToColor, sceneTokens } from "@/config/riskBands";

export interface SceneProps {
  home?: boolean | undefined;
  vessels?: Partial<Record<VesselId, number | undefined>> | undefined;
  selected?: VesselId | null | undefined;
  onSelect?: ((id: VesselId) => void) | undefined;
  elapsed?: number | undefined;
  resetKey?: number | undefined;
  zoom?: number | undefined;
  reducedMotion?: boolean | undefined;
  onReady?: (() => void) | undefined;
  onFailure?: (() => void) | undefined;
}

function Vessel({ id, index, probability, selected, onSelect, elapsed, reducedMotion, curve }: {
  id: VesselId; index: number; probability?: number | undefined; selected?: VesselId | null | undefined; onSelect?: ((id: VesselId) => void) | undefined; elapsed: number; reducedMotion?: boolean | undefined; curve: CatmullRomCurve3;
}) {
  const material = useRef<MeshStandardMaterial>(null);
  const marker = useRef<Mesh>(null);
  const dots = useRef<Group>(null);
  const phase = useRef(0);
  const hovered = useRef(false);
  const targetColor = useMemo(() => new Color(), []);
  useFrame((_, delta) => {
    const mapped = elapsed >= 1.4 + index * 0.4;
    targetColor.set(mapped ? riskToColor(probability) : sceneTokens.neutral);
    if (material.current) {
      material.current.color.lerp(targetColor, Math.min(1, delta * 8));
      material.current.opacity = selected && selected !== id ? 0.27 : 1;
      material.current.emissive.set(hovered.current ? targetColor : sceneTokens.neutral);
      material.current.emissiveIntensity = hovered.current ? 0.2 : 0;
    }
    if (marker.current) {
      const amount = probability === undefined ? 0 : Math.max(0, probability - 0.12);
      const target = elapsed >= 3.2 ? amount * 1.7 : 0;
      marker.current.scale.lerp(new Vector3(target, target * 1.3, target), Math.min(1, delta * 8));
      marker.current.visible = target > 0.03;
    }
    if (dots.current) {
      dots.current.visible = mapped && !reducedMotion && probability !== undefined;
      const near = Math.abs((phase.current % 1) - 0.55) < 0.14;
      phase.current += delta * 0.2 * (near ? 1 - (probability ?? 0) * 0.85 : 1);
      dots.current.children.forEach((dot, i) => dot.position.copy(curve.getPoint((phase.current + i * 0.33) % 1)));
    }
  });
  return <group>
    <mesh name={id} userData={{ id }} onClick={e => { e.stopPropagation(); onSelect?.(id); }} onPointerOver={e => { e.stopPropagation(); hovered.current = true; document.body.style.cursor = "pointer"; }} onPointerOut={() => { hovered.current = false; document.body.style.cursor = "auto"; }}>
      <tubeGeometry args={[curve, 70, 0.023, 8, false]} />
      <meshStandardMaterial ref={material} color={sceneTokens.neutral} roughness={0.28} metalness={0.06} transparent />
    </mesh>
    <mesh ref={marker} position={curve.getPoint(0.55)} scale={0}>
      <sphereGeometry args={[0.055, 14, 10]} /><meshStandardMaterial color={sceneTokens.marker} roughness={0.5} />
    </mesh>
    <group ref={dots}>{[0, 1, 2].map(i => <mesh key={i}><sphereGeometry args={[0.013, 8, 6]} /><meshBasicMaterial color={sceneTokens.flow} /></mesh>)}</group>
  </group>;
}

function HeartModel({ home, vessels, selected, onSelect, elapsed = 6, resetKey, zoom = 0, reducedMotion, onReady }: SceneProps) {
  const { scene } = useGLTF("/models/heart.glb");
  const heart = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse(object => {
      if (object instanceof Mesh) {
        const tune = (original: MeshStandardMaterial) => {
          const mat = original.clone();
          mat.roughness = 0.38; mat.metalness = 0.02; mat.emissiveIntensity = 0.06;
          return mat;
        };
        object.material = Array.isArray(object.material) ? object.material.map(m => tune(m as MeshStandardMaterial)) : tune(object.material as MeshStandardMaterial);
      }
    });
    clone.updateMatrixWorld(true);
    const box = new Box3().setFromObject(clone);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const scale = 2.5 / Math.max(size.x, size.y, size.z);
    const wrapper = new Group();
    clone.position.sub(center); wrapper.add(clone); wrapper.scale.setScalar(scale);
    wrapper.updateMatrixWorld(true);
    return wrapper;
  }, [scene]);
  const curves = useMemo(() => {
    const ray = new Raycaster();
    return Object.fromEntries(vesselIds.map(id => {
      const guide = new CatmullRomCurve3(vesselCurves[id].map(p => new Vector3(...p)));
      const points = guide.getPoints(40).map(point => {
        for (let attempt = 0; attempt < 8; attempt++) {
          const x = point.x * (1 - attempt * 0.1);
          ray.set(new Vector3(x, point.y, 5), new Vector3(0, 0, -1));
          const hit = ray.intersectObject(heart, true)[0];
          if (hit) return hit.point.clone().add(new Vector3(0, 0, 0.028));
        }
        return new Vector3(point.x * 0.5, point.y, point.z);
      });
      return [id, new CatmullRomCurve3(points)];
    })) as Record<VesselId, CatmullRomCurve3>;
  }, [heart]);
  const group = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const controls = useRef<OrbitControlsImpl>(null);
  const dragged = useRef(false);
  const focusing = useRef(true);
  const { camera } = useThree();
  const targetPosition = useRef(new Vector3(0, 0.1, 4.5));
  const targetLook = useRef(new Vector3(0, 0, 0));
  useEffect(() => { onReady?.(); }, [onReady]);
  useEffect(() => {
    focusing.current = true;
    dragged.current = false;
    targetPosition.current.set(0, 0.1, 4.5 - zoom * 0.35);
    targetLook.current.set(0, 0, 0);
  }, [resetKey, zoom]);
  useEffect(() => {
    if (home || !selected || elapsed < 3.2) return;
    const point = vesselCurves[selected][2];
    if (!point) return;
    focusing.current = true;
    targetLook.current.set(point[0] * 0.4, point[1] * 0.4, 0);
    targetPosition.current.set(point[0] * 1.3, 0.15, 3.9 - zoom * 0.3);
  }, [selected, home, elapsed >= 3.2, zoom]);
  useFrame((state, delta) => {
    if (group.current && !dragged.current && !reducedMotion && home) group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.32) * 0.12;
    if (ring.current) {
      ring.current.visible = !home && elapsed < 1.4 && !reducedMotion;
      ring.current.position.y = 1.2 - (elapsed / 1.4) * 2.5;
    }
    if (focusing.current && controls.current) {
      const alpha = reducedMotion ? 1 : Math.min(1, delta * 3);
      camera.position.lerp(targetPosition.current, alpha);
      controls.current.target.lerp(targetLook.current, alpha);
      controls.current.update();
      if (camera.position.distanceTo(targetPosition.current) < 0.01) focusing.current = false;
    }
  });
  return <>
    <ambientLight intensity={1.5} color={sceneTokens.ambient} />
    <directionalLight position={[3, 4, 5]} intensity={3} />
    <directionalLight position={[-4, 1, 2]} intensity={1.4} color={sceneTokens.ambient} />
    <directionalLight position={[0, 3, -3]} intensity={2} />
    <group ref={group}>
      <primitive object={heart} />
      {!home && vesselIds.map((id, i) => <Vessel key={id} id={id} index={i} probability={vessels?.[id]} selected={selected} onSelect={onSelect} elapsed={elapsed} reducedMotion={reducedMotion} curve={curves[id]} />)}
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.05, 0.009, 8, 80]} /><meshBasicMaterial color={sceneTokens.scan} transparent opacity={0.6} />
      </mesh>
    </group>
    <OrbitControls ref={controls} makeDefault enablePan={false} enableZoom={!home} minDistance={2.6} maxDistance={6.2} maxPolarAngle={Math.PI * 0.85} minPolarAngle={0.25} onStart={() => { dragged.current = true; focusing.current = false; }} />
  </>;
}

export default function HeartScene(props: SceneProps) {
  return <Canvas camera={{ position: [0, 0.1, 4.5], fov: 38 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }} onCreated={({ gl }) => {
    gl.domElement.addEventListener("webglcontextlost", e => { e.preventDefault(); props.onFailure?.(); });
  }}><HeartModel {...props} /></Canvas>;
}
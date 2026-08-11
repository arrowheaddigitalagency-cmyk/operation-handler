"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";

function SportCar() {
  const group = useRef<THREE.Group>(null);
  const underglow = useRef<THREE.Mesh>(null);

  const materials = useMemo(
    () => ({
      body: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#111418"),
        metalness: 0.92,
        roughness: 0.22,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        envMapIntensity: 1.35,
      }),
      accent: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#e84a27"),
        metalness: 0.55,
        roughness: 0.28,
        emissive: new THREE.Color("#e84a27"),
        emissiveIntensity: 0.22,
        clearcoat: 0.8,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#9ec9ff"),
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.72,
        thickness: 0.4,
        transparent: true,
        opacity: 0.85,
      }),
      chrome: new THREE.MeshStandardMaterial({
        color: new THREE.Color("#d9dee6"),
        metalness: 1,
        roughness: 0.12,
      }),
      tire: new THREE.MeshStandardMaterial({
        color: new THREE.Color("#0a0a0a"),
        roughness: 0.9,
        metalness: 0.05,
      }),
    }),
    [],
  );

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = Math.sin(t * 0.28) * 0.18 - 0.35;
    group.current.position.y = Math.sin(t * 0.9) * 0.05;
    if (underglow.current) {
      const mat = underglow.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.22 + Math.sin(t * 2.2) * 0.08;
    }
  });

  useEffect(() => {
    if (!group.current) return;
    gsap.fromTo(
      group.current.scale,
      { x: 0.65, y: 0.65, z: 0.65 },
      { x: 1, y: 1, z: 1, duration: 1.4, ease: "power3.out", delay: 0.2 },
    );
    gsap.fromTo(
      group.current.rotation,
      { y: -1.2 },
      { y: -0.35, duration: 1.6, ease: "power3.out", delay: 0.15 },
    );
  }, []);

  const wheel = (x: number, z: number) => (
    <group position={[x, 0.28, z]}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={materials.tire} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.18, 24]} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} material={materials.chrome} position={[0.02, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.2, 16]} />
      </mesh>
    </group>
  );

  return (
    <group ref={group} position={[0, -0.15, 0]} scale={1.15}>
      {/* Lower body */}
      <mesh position={[0, 0.42, 0]} material={materials.body} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.35, 1.15]} />
      </mesh>
      {/* Cabin */}
      <mesh position={[-0.15, 0.78, 0]} material={materials.body} castShadow>
        <boxGeometry args={[1.25, 0.42, 0.95]} />
      </mesh>
      {/* Hood slope hint */}
      <mesh position={[0.85, 0.58, 0]} rotation={[0, 0, -0.18]} material={materials.body} castShadow>
        <boxGeometry args={[0.9, 0.22, 1.05]} />
      </mesh>
      {/* Glass */}
      <mesh position={[-0.05, 0.86, 0]} material={materials.glass}>
        <boxGeometry args={[0.95, 0.28, 0.88]} />
      </mesh>
      {/* Accent stripe */}
      <mesh position={[0.1, 0.52, 0]} material={materials.accent}>
        <boxGeometry args={[2.2, 0.04, 1.18]} />
      </mesh>
      {/* Spoiler */}
      <mesh position={[-1.15, 0.72, 0]} material={materials.chrome} castShadow>
        <boxGeometry args={[0.12, 0.08, 1.05]} />
      </mesh>
      {wheel(0.78, 0.52)}
      {wheel(0.78, -0.52)}
      {wheel(-0.85, 0.52)}
      {wheel(-0.85, -0.52)}
      {/* Underglow */}
      <mesh ref={underglow} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 48]} />
        <meshBasicMaterial color="#e84a27" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  );
}

function OrbitRing() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 0.18;
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2.4, 0.2, 0]} position={[0, 0.2, 0]}>
      <torusGeometry args={[2.15, 0.012, 16, 120]} />
      <meshBasicMaterial color="#e84a27" transparent opacity={0.45} />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <spotLight position={[4, 6, 3]} intensity={55} angle={0.35} penumbra={0.7} castShadow color="#ffffff" />
      <spotLight position={[-4, 3, -2]} intensity={28} angle={0.5} penumbra={1} color="#e84a27" />
      <pointLight position={[0, 1.5, 3]} intensity={12} color="#ff7a4d" />

      <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.35}>
        <SportCar />
      </Float>
      <OrbitRing />

      <ContactShadows position={[0, -0.55, 0]} opacity={0.55} scale={10} blur={2.6} far={4} />
      <Environment resolution={256}>
        <Lightformer intensity={2.2} position={[0, 4, 2]} scale={[8, 2, 1]} form="rect" />
        <Lightformer intensity={1.4} position={[4, 1, -2]} scale={[4, 4, 1]} color="#e84a27" />
        <Lightformer intensity={0.8} position={[-5, 2, 1]} scale={[6, 2, 1]} />
      </Environment>
    </>
  );
}

export function HeroCanvas() {
  const [active, setActive] = useState(true);
  const [reduced, setReduced] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (reduced) return null;

  return (
    <div ref={wrapRef} className="hero-canvas pointer-events-none absolute inset-y-0 right-0 hidden w-[54%] lg:block">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [3.4, 1.6, 4.2], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
        frameloop={active ? "always" : "never"}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-black to-transparent" />
    </div>
  );
}

'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { Scene3DProvider } from '@/components/3d/Scene3DProvider';
import { Stars3D } from '@/components/3d/Stars3D';
import { PLANET_VISUAL, type PlanetKey } from '@/components/3d/planet-registry';

function GrahaHeroPlanet({ planet }: { planet: PlanetKey }) {
  const v = PLANET_VISUAL[planet];
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<MeshStandardMaterial>(null);
  const ringRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);
  const targetColor = useRef(new THREE.Color(v.color));
  const currentColor = useRef(new THREE.Color(v.color));

  // Update target color when planet prop changes
  useEffect(() => {
    targetColor.current.set(PLANET_VISUAL[planet].color);
  }, [planet]);

  useFrame((state, delta) => {
    // Lerp material color toward target
    if (matRef.current) {
      currentColor.current.lerp(targetColor.current, delta * 3.5);
      matRef.current.color.copy(currentColor.current);
      matRef.current.emissive.copy(currentColor.current);
    }

    if (meshRef.current) meshRef.current.rotation.y += delta * 0.22;
    if (ringRef.current) ringRef.current.rotation.z += delta * 0.07;
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.45) * 0.08;
    }
    if (haloRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 0.85) * 0.045;
      haloRef.current.scale.set(s, s, s);
    }
  });

  const r = 1.35;
  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[r, 64, 64]} />
        <meshStandardMaterial
          ref={matRef}
          color={v.color}
          emissive={v.color}
          emissiveIntensity={v.emissive}
          roughness={v.ghostly ? 0.85 : 0.35}
          metalness={v.ghostly ? 0.15 : 0.65}
          transparent={v.ghostly}
          opacity={v.ghostly ? 0.78 : 1}
        />
      </mesh>

      {v.ringed && (
        <>
          <mesh ref={ringRef} rotation={[Math.PI / 2.3, 0, 0]}>
            <torusGeometry args={[r * 1.85, 0.05, 16, 128]} />
            <meshBasicMaterial color={v.color} transparent opacity={0.7} />
          </mesh>
          <mesh rotation={[Math.PI / 2.3, 0, 0]}>
            <torusGeometry args={[r * 2.15, 0.02, 16, 128]} />
            <meshBasicMaterial color={v.color} transparent opacity={0.35} />
          </mesh>
        </>
      )}

      {v.corona && (
        <mesh>
          <sphereGeometry args={[r * 1.45, 32, 32]} />
          <meshBasicMaterial color={v.color} transparent opacity={0.14} />
        </mesh>
      )}

      <mesh ref={haloRef}>
        <sphereGeometry args={[r * 1.2, 32, 32]} />
        <meshBasicMaterial color={v.color} transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

export function GrahaHeroScene({ planet }: { planet: PlanetKey }) {
  return (
    <Scene3DProvider cameraPosition={[0, 0, 5]}>
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 4, 4]} intensity={1.1} color="#F2CA50" />
      <pointLight position={[-4, -2, 2]} intensity={0.45} color="#9050E0" />
      <Stars3D count={180} radius={9} size={0.022} />
      <GrahaHeroPlanet planet={planet} />
    </Scene3DProvider>
  );
}

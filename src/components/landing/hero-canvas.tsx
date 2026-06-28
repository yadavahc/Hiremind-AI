"use client";
import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function ParticleField() {
  const points = useRef<THREE.Points>(null);
  const lines = useRef<THREE.LineSegments>(null);
  const { viewport } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  const COUNT = 1400;
  const { positions, basePositions } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      // Spherical shell with jitter -> "neural cloud"
      const r = 3.4 + Math.random() * 1.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return { positions, basePositions: positions.slice() };
  }, []);

  // A sparse set of connecting filaments near the core
  const linePositions = useMemo(() => {
    const segs: number[] = [];
    for (let i = 0; i < 90; i++) {
      const a = Math.floor(Math.random() * COUNT);
      const b = Math.floor(Math.random() * COUNT);
      segs.push(
        basePositions[a * 3], basePositions[a * 3 + 1], basePositions[a * 3 + 2],
        basePositions[b * 3], basePositions[b * 3 + 1], basePositions[b * 3 + 2]
      );
    }
    return new Float32Array(segs);
  }, [basePositions]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    mouse.current.x += (state.pointer.x - mouse.current.x) * 0.05;
    mouse.current.y += (state.pointer.y - mouse.current.y) * 0.05;

    if (points.current) {
      points.current.rotation.y += delta * 0.04;
      points.current.rotation.x = mouse.current.y * 0.25;
      points.current.rotation.z += delta * 0.005;
      const pos = points.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < COUNT; i++) {
        const ix = i * 3;
        const breathe = 1 + Math.sin(t * 0.6 + i * 0.01) * 0.015;
        pos[ix] = basePositions[ix] * breathe;
        pos[ix + 1] = basePositions[ix + 1] * breathe;
        pos[ix + 2] = basePositions[ix + 2] * breathe;
      }
      points.current.geometry.attributes.position.needsUpdate = true;
    }
    if (lines.current) {
      lines.current.rotation.copy(points.current!.rotation);
    }
  });

  return (
    <group scale={viewport.width > 8 ? 1 : 0.7}>
      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} count={COUNT} />
        </bufferGeometry>
        <pointsMaterial size={0.028} color="#d6dae2" transparent opacity={0.85} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <lineSegments ref={lines}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} count={linePositions.length / 3} />
        </bufferGeometry>
        <lineBasicMaterial color="#8a909c" transparent opacity={0.12} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <mesh>
        <sphereGeometry args={[1.1, 32, 32]} />
        <meshBasicMaterial color="#c8cdd6" transparent opacity={0.04} />
      </mesh>
    </group>
  );
}

export default function HeroCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 55 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      dpr={[1, 1.8]}
    >
      <ParticleField />
    </Canvas>
  );
}

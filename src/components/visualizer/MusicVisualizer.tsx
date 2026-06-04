"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { stemFrameAt } from "@/lib/analysis/fallback";
import type { LayerId, Mood, TrackAnalysis } from "@/types/music";
import { moodPalettes } from "./palette";

type VisualizerProps = {
  analysis: TrackAnalysis;
  progressMs: number;
  isPlaying: boolean;
  mood: Mood;
  layers: Record<LayerId, boolean>;
};

export function MusicVisualizer(props: VisualizerProps) {
  const palette = moodPalettes[props.mood];

  return (
    <div className="fixed inset-0 h-dvh w-dvw max-w-[100dvw] overflow-hidden bg-slate-950">
      <Canvas className="h-full w-full" camera={{ position: [0, 0, 8], fov: 58 }} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={[palette.bg]} />
        <fog attach="fog" args={[palette.bg, 8, 22]} />
        <ambientLight intensity={0.35} />
        <pointLight position={[3, 4, 5]} intensity={2.2} color={palette.vocals} />
        <pointLight position={[-5, -3, 3]} intensity={1.4} color={palette.drums} />
        <ResponsiveScene {...props} />
      </Canvas>
    </div>
  );
}

function ResponsiveScene(props: VisualizerProps) {
  const { camera, size } = useThree();
  const isNarrow = size.width < 520;
  const isPortrait = size.height > size.width;
  const sceneScale = isNarrow ? 0.56 : isPortrait ? 0.72 : 1;

  useEffect(() => {
    camera.position.z = isNarrow ? 10.5 : isPortrait ? 9.4 : 8;
    camera.updateProjectionMatrix();
  }, [camera, isNarrow, isPortrait]);

  return (
    <group scale={sceneScale} position={[0, isNarrow ? 0.25 : 0, 0]}>
      <Scene {...props} />
    </group>
  );
}

function Scene({ analysis, progressMs, isPlaying, mood, layers }: VisualizerProps) {
  const seconds = progressMs / 1000;
  const stems = stemFrameAt(seconds, analysis);
  const palette = moodPalettes[mood];

  return (
    <group rotation={[0.08, 0, 0]}>
      {layers.other ? <ParticleField time={seconds} intensity={stems.other} color={palette.other} isPlaying={isPlaying} /> : null}
      {layers.bass ? <BassBlob time={seconds} intensity={stems.bass} color={palette.bass} /> : null}
      {layers.vocals ? <VocalRibbon time={seconds} intensity={stems.vocals} color={palette.vocals} /> : null}
      {layers.drums ? <DrumRings time={seconds} intensity={stems.drums} analysis={analysis} color={palette.drums} /> : null}
    </group>
  );
}

function BassBlob({ time, intensity, color }: { time: number; intensity: number; color: string }) {
  const mesh = useRef<THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshStandardMaterial>>(null);
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1.65, 32), []);
  const base = useMemo(() => Float32Array.from(geometry.attributes.position.array), [geometry]);

  useFrame(() => {
    const position = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i += 1) {
      const ix = i * 3;
      const x = base[ix];
      const y = base[ix + 1];
      const z = base[ix + 2];
      const normal = new THREE.Vector3(x, y, z).normalize();
      const noise = Math.sin(x * 3.1 + time * 2.3) + Math.cos(y * 4.2 - time * 1.7) + Math.sin(z * 5 + time);
      const scale = 1 + intensity * 0.22 + noise * 0.045;
      position.setXYZ(i, normal.x * 1.65 * scale, normal.y * 1.65 * scale, normal.z * 1.65 * scale);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    if (mesh.current) mesh.current.rotation.y = time * 0.18;
  });

  return (
    <mesh ref={mesh} geometry={geometry}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55 + intensity * 1.2} roughness={0.25} metalness={0.35} wireframe />
    </mesh>
  );
}

function DrumRings({ time, intensity, analysis, color }: { time: number; intensity: number; analysis: TrackAnalysis; color: string }) {
  const recentBeats = analysis.beats.filter((beat) => time - beat.start >= 0 && time - beat.start < 1.6).slice(-8);

  return (
    <group>
      {recentBeats.map((beat, index) => {
        const age = time - beat.start;
        const radius = 1.9 + age * 3.2;
        const opacity = Math.max(0, 1 - age / 1.6) * (beat.confidence ?? 0.7) * (0.45 + intensity);
        return (
          <mesh key={`${beat.start}-${index}`} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius, 0.012 + intensity * 0.02, 16, 128]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} />
          </mesh>
        );
      })}
    </group>
  );
}

function VocalRibbon({ time, intensity, color }: { time: number; intensity: number; color: string }) {
  const points = useMemo(() => Array.from({ length: 96 }, (_, i) => new THREE.Vector3((i - 48) * 0.09, 0, 0)), []);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  const line = useMemo(() => {
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.75 });
    return new THREE.Line(geometry, material);
  }, [color, geometry]);

  useFrame(() => {
    const position = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i += 1) {
      const x = (i - 48) * 0.09;
      const y = Math.sin(i * 0.18 + time * 2.2) * (0.22 + intensity * 0.38);
      const z = Math.cos(i * 0.12 - time * 1.4) * 0.45;
      position.setXYZ(i, x, y, z);
    }
    position.needsUpdate = true;
  });

  return <primitive object={line} position={[0, -0.15, 0.7]} />;
}

function ParticleField({ time, intensity, color, isPlaying }: { time: number; intensity: number; color: string; isPlaying: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const { size } = useThree();
  const isPortrait = size.height > size.width;
  const geometry = useMemo(() => {
    const particleCount = 460;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    const field = new THREE.BufferGeometry();
    field.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return field;
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = time * (isPlaying ? 0.035 + intensity * 0.04 : 0.01);
    pointsRef.current.rotation.x = Math.sin(time * 0.13) * 0.08;
  });

  return (
    <points ref={pointsRef} geometry={geometry} scale={[isPortrait ? 1.35 : 1, isPortrait ? 1.08 : 1, 1]}>
      <pointsMaterial color={color} size={0.028 + intensity * 0.045} transparent opacity={0.62} depthWrite={false} />
    </points>
  );
}

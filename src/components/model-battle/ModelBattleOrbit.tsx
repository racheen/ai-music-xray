"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import type { ComparisonSummary, ModelBattleOutput } from "@/lib/model-battle/types";
import { clsx } from "clsx";

type Props = {
  outputs: ModelBattleOutput[];
  summary: ComparisonSummary;
  className?: string;
};

export function ModelBattleOrbit({ outputs, summary, className }: Props) {
  return (
    <div
      className={clsx(
        "relative h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,.22),transparent_28%),radial-gradient(circle_at_70%_30%,rgba(16,185,129,.16),transparent_28%),linear-gradient(180deg,rgba(3,10,6,.96),rgba(4,17,10,.92))] shadow-2xl shadow-emerald-950/30",
        className
      )}
    >
      <Canvas camera={{ position: [0, 0, 9], fov: 52 }} gl={{ antialias: true, alpha: true }}>
        <color attach="background" args={["#04110a"]} />
        <fog attach="fog" args={["#04110a", 6.5, 18]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 5, 6]} intensity={1.8} color="#c7f9d4" />
        <directionalLight position={[-4, -3, 2]} intensity={1.2} color="#86efac" />
        <ModelBattleScene outputs={outputs} summary={summary} />
      </Canvas>
    </div>
  );
}

function ModelBattleScene({ outputs, summary }: Props) {
  const count = outputs.length || 1;
  const radius = 3.1;
  const center = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.1, 48, 48]} />
        <meshStandardMaterial color="#16a34a" emissive="#22c55e" emissiveIntensity={0.35} roughness={0.3} metalness={0.08} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.05, 0.03, 16, 120]} />
        <meshBasicMaterial color="#86efac" transparent opacity={0.45} />
      </mesh>
      {outputs.map((output, index) => {
        const angle = (index / count) * Math.PI * 2 + performance.now() * 0.00004;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.72;
        const z = Math.sin(angle * 1.2) * 0.9;
        const intensity = clamp(0.35 + output.evaluation.overall / 120);
        const color = output.hallucinationRisk > 55 ? "#fbbf24" : "#d1fae5";

        return (
          <group key={output.providerName} position={[x, y, z]}>
            <ConnectionLine points={[center, new THREE.Vector3(x, y, z)]} opacity={0.2 + output.similarityScore / 320} />
            <mesh>
              <sphereGeometry args={[0.5 + output.evaluation.uniqueness / 240, 32, 32]} />
              <meshStandardMaterial color={color} emissive="#14532d" emissiveIntensity={0.18 + intensity} roughness={0.45} metalness={0.12} />
            </mesh>
            <mesh position={[0, 0.95, 0]}>
              <planeGeometry args={[1.75, 0.56]} />
              <meshBasicMaterial color="#04110a" transparent opacity={0.82} />
            </mesh>
          </group>
        );
      })}

      {summary.similarityMatrix.map((entry, index) => {
        const leftIndex = outputs.findIndex((output) => output.providerName === entry.left);
        const rightIndex = outputs.findIndex((output) => output.providerName === entry.right);
        if (leftIndex < 0 || rightIndex < 0) return null;
        const leftAngle = (leftIndex / count) * Math.PI * 2;
        const rightAngle = (rightIndex / count) * Math.PI * 2;
        const left = new THREE.Vector3(Math.cos(leftAngle) * radius, Math.sin(leftAngle) * radius * 0.72, Math.sin(leftAngle * 1.2) * 0.9);
        const right = new THREE.Vector3(Math.cos(rightAngle) * radius, Math.sin(rightAngle) * radius * 0.72, Math.sin(rightAngle * 1.2) * 0.9);
        return <ConnectionLine key={`${entry.left}-${entry.right}-${index}`} points={[left, right]} opacity={0.04 + entry.score / 2200} />;
      })}

      <group position={[0, -2.9, 0]}>
        <mesh>
          <planeGeometry args={[8.6, 1.5]} />
          <meshBasicMaterial color="#04110a" transparent opacity={0.45} />
        </mesh>
      </group>
    </group>
  );
}

function ConnectionLine({ points, opacity }: { points: THREE.Vector3[]; opacity: number }) {
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: "#86efac", transparent: true, opacity });
    return new THREE.Line(geometry, material);
  }, [opacity, points]);

  return <primitive object={line} />;
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

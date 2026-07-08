"use client";

import { Html, OrbitControls, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { clsx } from "clsx";
import type { ComparisonSummary, ModelBattleOutput } from "@/lib/model-battle/types";

type Props = {
  outputs: ModelBattleOutput[];
  summary: ComparisonSummary;
  className?: string;
};

type OrbitNode = {
  output: ModelBattleOutput;
  position: THREE.Vector3;
  ringRadius: number;
  color: string;
  confidenceLabel: string;
};

export function ModelBattleOrbit({ outputs, summary, className }: Props) {
  const nodes = useMemo(() => buildNodes(outputs), [outputs]);

  return (
    <div
      className={clsx(
        "relative h-[420px] touch-none overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_50%_48%,rgba(34,197,94,.18),transparent_18%),radial-gradient(circle_at_20%_18%,rgba(34,197,94,.12),transparent_24%),radial-gradient(circle_at_78%_82%,rgba(250,204,21,.10),transparent_22%),linear-gradient(180deg,rgba(3,10,6,.98),rgba(4,17,10,.94))] shadow-2xl shadow-emerald-950/30",
        className
      )}
    >
      <Canvas camera={{ position: [0, 3.2, 8.2], fov: 42 }} gl={{ antialias: true, alpha: true }}>
        <color attach="background" args={["#04110a"]} />
        <fog attach="fog" args={["#04110a", 8, 18]} />
        <ambientLight intensity={0.85} />
        <pointLight position={[0, 2.5, 0]} intensity={14} color="#86efac" />
        <pointLight position={[6, 3, 5]} intensity={6} color="#facc15" />
        <pointLight position={[-6, 2, 5]} intensity={3} color="#22c55e" />
        <Stars radius={32} depth={24} count={1200} factor={2.8} saturation={0} fade speed={0.3} />
        <OrbitScene nodes={nodes} summary={summary} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={0.25}
          rotateSpeed={0.7}
          minPolarAngle={Math.PI / 2.7}
          maxPolarAngle={Math.PI / 2.05}
          minAzimuthAngle={-Math.PI / 2}
          maxAzimuthAngle={Math.PI / 2}
        />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400 backdrop-blur">
          Drag to rotate
        </div>
      </div>
    </div>
  );
}

function OrbitScene({ nodes, summary }: { nodes: OrbitNode[]; summary: ComparisonSummary }) {
  const center = useMemo(() => new THREE.Vector3(0, 0.18, 0), []);
  const orbitRings = [1.35, 2.05, 2.75, 3.45, 4.15];

  return (
    <group rotation={[0.97, 0.12, 0]}>
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.42, 48, 48]} />
        <meshStandardMaterial color="#a7f3d0" emissive="#4ade80" emissiveIntensity={2.4} roughness={0.2} metalness={0.04} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.82, 48, 48]} />
        <meshBasicMaterial color="#4ade80" transparent opacity={0.12} />
      </mesh>
      {orbitRings.map((radius, index) => (
        <mesh key={radius} rotation={[Math.PI / 2, 0, index * 0.04]} position={[0, 0, 0]}>
          <torusGeometry args={[radius, 0.017, 14, 180]} />
          <meshBasicMaterial
            color={index > 2 ? "#d4a72c" : "#1f8d54"}
            transparent
            opacity={index > 2 ? 0.2 : 0.24}
          />
        </mesh>
      ))}

      {nodes.map((node) => (
        <group key={node.output.providerKey} position={node.position.toArray()}>
          <ConnectionLine points={[center, node.position]} opacity={0.18 + node.output.similarityScore / 380} color={node.color} />
          <mesh>
            <sphereGeometry args={[0.16, 32, 32]} />
            <meshStandardMaterial color={node.color} emissive={node.color} emissiveIntensity={1.35} roughness={0.26} metalness={0.1} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
            <torusGeometry args={[0.28, 0.02, 12, 100]} />
            <meshBasicMaterial color={node.color} transparent opacity={0.7} />
          </mesh>
          <Html position={[0, 0.34, 0]} center transform sprite distanceFactor={7.2}>
            <div className="pointer-events-none min-w-[5.6rem] text-center">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white">{node.output.providerName}</div>
              <div className="mt-1 text-[10px] text-slate-300">{node.confidenceLabel}</div>
            </div>
          </Html>
        </group>
      ))}

      {summary.similarityMatrix.map((entry, index) => {
        const left = nodes.find((node) => node.output.providerName === entry.left)?.position;
        const right = nodes.find((node) => node.output.providerName === entry.right)?.position;
        if (!left || !right) return null;
        return <ConnectionLine key={`${entry.left}-${entry.right}-${index}`} points={[left, right]} opacity={0.02 + entry.score / 2600} color="#6ee7b7" />;
      })}

      <Html position={[0, -0.65, 0]} center transform sprite distanceFactor={8}>
        <div className="pointer-events-none text-center">
          <div className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/90">Agreement</div>
          <div className="mt-1 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-50">Center</div>
        </div>
      </Html>
    </group>
  );
}

function ConnectionLine({ points, opacity, color }: { points: THREE.Vector3[]; opacity: number; color: string }) {
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    return new THREE.Line(geometry, material);
  }, [color, opacity, points]);

  return <primitive object={line} />;
}

 function buildNodes(outputs: ModelBattleOutput[]) {
  const fallbackOutput: ModelBattleOutput[] = outputs.length
    ? outputs
    : [
        {
          providerKey: "local",
          providerName: "Awaiting models",
          model: "Pending",
          latencyMs: 0,
          outputLength: 0,
          estimatedTokens: 0,
          parsed: {
            summary: "",
            emotional_profile: [],
            genre_hypothesis: [],
            production_notes: [],
            listener_match_reasons: [],
            virality_factors: [],
            confidence: 0,
            evidence: [],
            limitations: [],
            recommended_visualization: ""
          },
          rawText: "",
          evaluation: {
            jsonValidity: 0,
            evidenceCoverage: 0,
            factualGrounding: 0,
            specificity: 0,
            usefulness: 0,
            hallucinationRisk: 0,
            consistencyWithAudioFeatures: 0,
            clarity: 0,
            uniqueness: 0,
            overall: 0
          },
          similarityScore: 0,
          hallucinationRisk: 0,
          retryCount: 0
        }
      ];

  return fallbackOutput.map((output, index) => {
    const confidencePct = Math.round((output.parsed.confidence ?? 0) * 100);
    const ringRadius = 1.35 + (100 - confidencePct) * 0.03 + output.hallucinationRisk * 0.01;
    const angle = -Math.PI / 2 + (index / Math.max(fallbackOutput.length, 1)) * Math.PI * 2;
    const x = Math.cos(angle) * ringRadius;
    const z = Math.sin(angle) * ringRadius * 0.88;
    const y = 0.18 + (output.evaluation.uniqueness / 100) * 0.22;
    return {
      output,
      ringRadius,
      position: new THREE.Vector3(x, y, z),
      color: nodeColor(output),
      confidenceLabel: `${confidencePct}% confidence`
    };
  });
}

function nodeColor(output: ModelBattleOutput) {
  if (output.hallucinationRisk >= 60) return "#ef4444";
  if (output.parsed.confidence >= 0.78) return "#4ade80";
  if (output.parsed.confidence >= 0.62) return "#facc15";
  return "#f59e0b";
}

import React, { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";

const MOVES = {
  shrimp: {
    title: "Shrimp / Hip Escape",
    subtitle: "Create space from pressure",
    description: "A foundational escape movement. The bottom player frames, turns to the side, and slides the hips away to recover space.",
    color: "#60a5fa",
  },
  bridge: {
    title: "Bridge & Roll",
    subtitle: "Escape the mount",
    description: "The bottom player traps one side, bridges the hips high, and rolls the top player over to reverse position.",
    color: "#34d399",
  },
  choke: {
    title: "Rear Naked Choke",
    subtitle: "High-percentage submission",
    description: "The back player controls from behind, wraps the choking arm under the neck, and locks the finish with body control.",
    color: "#f97316",
  },
};

function Limb({ start, end, color = "#e5e7eb" }) {
  const mid = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const angle = Math.atan2(dx, dz);

  return (
    <mesh position={mid} rotation={[Math.PI / 2, angle, 0]}>
      <cylinderGeometry args={[0.035, 0.035, length, 12]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function StickFigure({ x = 0, z = 0, rotation = 0, color = "#e5e7eb", pose = "neutral", scale = 1 }) {
  const group = useRef();

  const poses = {
    neutral: {
      head: [0, 0.95, 0], torsoTop: [0, 0.72, 0], torsoBottom: [0, 0.36, 0],
      lHand: [-0.35, 0.5, 0.05], rHand: [0.35, 0.5, 0.05], lFoot: [-0.32, 0.05, 0.1], rFoot: [0.32, 0.05, 0.1],
    },
    side: {
      head: [0.1, 0.78, 0], torsoTop: [0, 0.58, 0], torsoBottom: [-0.18, 0.32, 0],
      lHand: [-0.44, 0.5, 0.05], rHand: [0.38, 0.42, 0.05], lFoot: [-0.55, 0.08, 0.1], rFoot: [0.2, 0.08, 0.1],
    },
    bridge: {
      head: [0, 0.45, 0], torsoTop: [0, 0.7, 0], torsoBottom: [0, 0.55, 0],
      lHand: [-0.34, 0.42, 0.05], rHand: [0.34, 0.42, 0.05], lFoot: [-0.38, 0.05, 0.1], rFoot: [0.38, 0.05, 0.1],
    },
    choke: {
      head: [0, 0.9, 0], torsoTop: [0, 0.68, 0], torsoBottom: [0, 0.35, 0],
      lHand: [-0.18, 0.78, -0.1], rHand: [0.28, 0.7, -0.1], lFoot: [-0.42, 0.08, 0.08], rFoot: [0.42, 0.08, 0.08],
    },
  };

  const p = poses[pose];

  return (
    <group ref={group} position={[x, 0.05, z]} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={p.head}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Limb start={p.torsoTop} end={p.torsoBottom} color={color} />
      <Limb start={p.torsoTop} end={p.lHand} color={color} />
      <Limb start={p.torsoTop} end={p.rHand} color={color} />
      <Limb start={p.torsoBottom} end={p.lFoot} color={color} />
      <Limb start={p.torsoBottom} end={p.rFoot} color={color} />
    </group>
  );
}

function BJJMoveScene({ move }) {
  const t = useRef(0);
  const [tick, setTick] = useState(0);

  useFrame((_, delta) => {
    t.current += delta;
    setTick(t.current);
  });

  const phase = (Math.sin(tick * 1.2) + 1) / 2;
  const selected = MOVES[move];

  let bottom = { x: -0.4, z: 0, rotation: Math.PI / 2, pose: "neutral" };
  let top = { x: 0.4, z: 0, rotation: -Math.PI / 2, pose: "neutral" };

  if (move === "shrimp") {
    bottom = { x: -0.8 - phase * 0.85, z: phase * 0.45, rotation: Math.PI / 2 + phase * 0.4, pose: "side" };
    top = { x: -0.05, z: 0, rotation: -Math.PI / 2, pose: "neutral" };
  }

  if (move === "bridge") {
    bottom = { x: -0.2, z: 0, rotation: Math.PI / 2, pose: "bridge" };
    top = { x: 0.15 + phase * 0.75, z: phase * 0.55, rotation: -Math.PI / 2 - phase * 1.1, pose: "neutral" };
  }

  if (move === "choke") {
    bottom = { x: 0.15, z: 0, rotation: Math.PI, pose: "neutral" };
    top = { x: -0.15, z: -0.18, rotation: Math.PI, pose: "choke" };
  }

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.2, 96]} />
        <meshStandardMaterial color="#111827" roughness={0.8} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[2.15, 2.18, 96]} />
        <meshBasicMaterial color={selected.color} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[0.9, 0.92, 96]} />
        <meshBasicMaterial color="#334155" />
      </mesh>

      <StickFigure {...bottom} color="#e5e7eb" scale={1.05} />
      <StickFigure {...top} color={selected.color} scale={1.05} />

      <Text position={[0, 0.04, -2.85]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.18} color="#cbd5e1" anchorX="center">
        {selected.title}
      </Text>

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        minPolarAngle={0.45}
        maxPolarAngle={1.2}
      />
    </>
  );
}

export default function App() {
  const [move, setMove] = useState("shrimp");
  const selected = MOVES[move];

  return (
    <main className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 md:px-8 md:py-8">
        <header className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">BJJ Intelligence Lab</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-6xl">Learn the mat visually.</h1>
          </div>
          <div className="hidden rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 md:block">
            Beginner MVP
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 md:grid md:grid-cols-[1.25fr_0.75fr]">
          <div className="relative min-h-[55vh] md:min-h-[620px]">
            <Canvas camera={{ position: [0, 4.7, 5.2], fov: 42 }} shadows>
              <BJJMoveScene move={move} />
            </Canvas>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-sm font-semibold text-slate-400">Selected move</p>
              <h2 className="mt-2 text-2xl font-black">{selected.title}</h2>
              <p className="mt-1 text-sm font-medium" style={{ color: selected.color }}>{selected.subtitle}</p>
              <p className="mt-4 text-sm leading-6 text-slate-300">{selected.description}</p>
            </div>

            <div className="grid gap-3">
              {Object.entries(MOVES).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => setMove(key)}
                  className={`rounded-2xl border p-4 text-left transition active:scale-[0.98] ${
                    move === key
                      ? "border-white bg-white text-slate-950"
                      : "border-slate-800 bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{item.title}</p>
                      <p className={`text-sm ${move === key ? "text-slate-700" : "text-slate-400"}`}>{item.subtitle}</p>
                    </div>
                    <span className="h-3 w-3 rounded-full" style={{ background: item.color }} />
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-sm font-semibold text-slate-400">Next product layer</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>• Upload training video</li>
                <li>• Detect body keypoints</li>
                <li>• Replay movement on 3D mat</li>
                <li>• Compare against clean technique model</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

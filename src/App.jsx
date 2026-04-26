import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

const MOVES = {
  choke: {
    title: "Rear Naked Choke",
    subtitle: "Back control to blood choke",
    description: "The back player keeps chest-to-back pressure, threads the choking arm deep under the jawline, hides the support hand behind the head, and finishes by drawing the elbows back while the hooks control the hips.",
    color: "#f97316",
  },
};

const smooth = (value) => value * value * (3 - 2 * value);
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const segment = (cycle, start, end) => smooth(clamp01((cycle - start) / (end - start)));
const mix = (a, b, t) => a + (b - a) * t;
const mixPoint = (a, b, t) => a.map((value, index) => mix(value, b[index], t));

function Limb({ start, end, color = "#e5e7eb", radius = 0.035 }) {
  const { mid, quaternion, length } = useMemo(() => {
    const startVector = new THREE.Vector3(...start);
    const endVector = new THREE.Vector3(...end);
    const direction = endVector.clone().sub(startVector);
    const safeLength = Math.max(direction.length(), 0.001);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    );

    return {
      mid: startVector.clone().add(endVector).multiplyScalar(0.5).toArray(),
      quaternion: q,
      length: safeLength,
    };
  }, [start, end]);

  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 14]} />
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

function Joint({ position, color, size = 0.052 }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  );
}

function Grappler({ points, color, headColor = color, radius = 0.038 }) {
  const bones = [
    ["neck", "chest"],
    ["chest", "pelvis"],
    ["leftShoulder", "rightShoulder"],
    ["leftHip", "rightHip"],
    ["leftShoulder", "leftHip"],
    ["rightShoulder", "rightHip"],
    ["neck", "leftShoulder"],
    ["leftShoulder", "leftElbow"],
    ["leftElbow", "leftHand"],
    ["neck", "rightShoulder"],
    ["rightShoulder", "rightElbow"],
    ["rightElbow", "rightHand"],
    ["leftHip", "leftKnee"],
    ["leftKnee", "leftFoot"],
    ["rightHip", "rightKnee"],
    ["rightKnee", "rightFoot"],
  ];

  return (
    <group>
      <mesh position={points.head}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshStandardMaterial color={headColor} roughness={0.45} />
      </mesh>

      {bones.map(([start, end]) => (
        <Limb key={`${start}-${end}`} start={points[start]} end={points[end]} color={color} radius={radius} />
      ))}

      {["leftElbow", "rightElbow", "leftKnee", "rightKnee", "leftHand", "rightHand"].map((name) => (
        <Joint key={name} position={points[name]} color={color} />
      ))}
    </group>
  );
}

function RearNakedChokeScene({ color, tick }) {
  const cycle = (tick * 0.13) % 1;
  const settle = segment(cycle, 0.02, 0.2);
  const pummel = segment(cycle, 0.16, 0.38);
  const lock = segment(cycle, 0.34, 0.58);
  const squeeze = segment(cycle, 0.54, 0.82) * (1 - segment(cycle, 0.88, 0.99));
  const handFight = Math.sin(tick * 8) * (1 - lock) * 0.025;
  const breathe = Math.sin(tick * 4.4) * 0.012;
  const shoulderCrunch = squeeze * 0.055;
  const hipPull = squeeze * 0.05;

  const defender = {
    head: [0.015 * pummel, 0.92 - squeeze * 0.045 + breathe, 0.14 - shoulderCrunch],
    neck: [0.006 * pummel, 0.77 - squeeze * 0.035, 0.09 - shoulderCrunch],
    chest: [0, 0.59 - squeeze * 0.02, 0.045 - shoulderCrunch],
    pelvis: [0, 0.32, 0.02 - hipPull],
    leftShoulder: [-0.19 + shoulderCrunch, 0.69 - squeeze * 0.02, 0.07 - shoulderCrunch],
    rightShoulder: [0.19 - shoulderCrunch, 0.69 - squeeze * 0.02, 0.07 - shoulderCrunch],
    leftHip: [-0.16, 0.36, 0.025 - hipPull],
    rightHip: [0.16, 0.36, 0.025 - hipPull],
    leftElbow: [-0.34, 0.57 + handFight, 0.18],
    rightElbow: [0.34, 0.55 - handFight, 0.18],
    leftHand: mixPoint([-0.47, 0.43, 0.24], [-0.18, 0.8 + handFight, 0.22], pummel * 0.85),
    rightHand: mixPoint([0.47, 0.42, 0.24], [0.25, 0.75 - handFight, 0.2], pummel * 0.72),
    leftKnee: [-0.36, 0.19, 0.34],
    rightKnee: [0.36, 0.19, 0.34],
    leftFoot: [-0.5, 0.055, 0.12],
    rightFoot: [0.5, 0.055, 0.12],
  };

  const attacker = {
    head: [0, 1.02 + breathe * 0.7, -0.36 + settle * 0.05 + squeeze * 0.045],
    neck: [0, 0.84, -0.32 + settle * 0.04 + squeeze * 0.045],
    chest: [0, 0.64, -0.27 + settle * 0.05 + squeeze * 0.075],
    pelvis: [0, 0.34, -0.22 + settle * 0.035],
    leftShoulder: [-0.21 + squeeze * 0.02, 0.735, -0.28 + settle * 0.04],
    rightShoulder: [0.21 - squeeze * 0.02, 0.735, -0.28 + settle * 0.04],
    leftHip: [-0.17, 0.38, -0.22 + settle * 0.035],
    rightHip: [0.17, 0.38, -0.22 + settle * 0.035],
    leftElbow: mixPoint([-0.5, 0.72, -0.18], [-0.24, 0.79 - squeeze * 0.04, 0.11], pummel),
    leftHand: mixPoint([-0.58, 0.73, -0.09], [0.18 - squeeze * 0.06, 0.78 - squeeze * 0.03, 0.09], pummel),
    rightElbow: mixPoint([0.45, 0.63, -0.2], [0.3 - squeeze * 0.11, 0.71 - squeeze * 0.015, -0.015], lock),
    rightHand: mixPoint([0.51, 0.55, -0.1], [-0.19, 0.92 - squeeze * 0.045, -0.08], lock),
    leftKnee: [-0.46 - hipPull * 0.4, 0.36, 0.08],
    rightKnee: [0.46 + hipPull * 0.4, 0.36, 0.08],
    leftFoot: [-0.12, 0.2, 0.3 - hipPull],
    rightFoot: [0.12, 0.2, 0.3 - hipPull],
  };

  return (
    <group rotation={[0, Math.PI, 0]} position={[0, 0.03, 0.14]} scale={1.14}>
      <mesh position={[0, 0.35, -0.08]} rotation={[-0.22, 0, 0]}>
        <capsuleGeometry args={[0.22, 0.62, 8, 18]} />
        <meshStandardMaterial color="#fb923c" transparent opacity={0.13} roughness={0.7} />
      </mesh>

      <Grappler points={defender} color="#dbe4ee" headColor="#f8fafc" radius={0.04} />
      <Grappler points={attacker} color={color} radius={0.043} />
    </group>
  );
}

function HipThrowScene({ color, tick }) {
  const cycle = (tick * 0.16) % 1;
  const grip = segment(cycle, 0.04, 0.2);
  const entry = segment(cycle, 0.18, 0.42);
  const load = segment(cycle, 0.36, 0.58);
  const throwPhase = segment(cycle, 0.54, 0.78);
  const reset = segment(cycle, 0.88, 0.99);
  const finish = throwPhase * (1 - reset);
  const breathe = Math.sin(tick * 5) * 0.008;

  const toriTurn = entry * 0.55 + load * 0.18;
  const ukeLift = load * 0.26;
  const ukeDrop = finish * 0.46;
  const ukeTravel = finish * 0.78;
  const ukeTilt = load * 0.2 + finish * 0.68;

  const attacker = {
    head: [-0.2 + entry * 0.28, 1.06 + breathe - load * 0.03, -0.18 + toriTurn],
    neck: [-0.18 + entry * 0.25, 0.88 - load * 0.04, -0.12 + toriTurn],
    chest: [-0.12 + entry * 0.25, 0.68 - load * 0.06, -0.06 + toriTurn],
    pelvis: [-0.04 + entry * 0.34, 0.42 - load * 0.08, 0.02 + toriTurn],
    leftShoulder: [-0.32 + entry * 0.22, 0.74 - load * 0.04, -0.08 + toriTurn],
    rightShoulder: [0.08 + entry * 0.27, 0.74 - load * 0.04, -0.03 + toriTurn],
    leftHip: [-0.22 + entry * 0.32, 0.43 - load * 0.08, 0.0 + toriTurn],
    rightHip: [0.12 + entry * 0.34, 0.43 - load * 0.08, 0.06 + toriTurn],
    leftElbow: mixPoint([-0.42, 0.66, 0.06], [-0.1, 0.83, 0.22], grip),
    rightElbow: mixPoint([0.18, 0.62, 0.02], [0.36 - finish * 0.18, 0.68 - finish * 0.12, 0.22 + toriTurn], grip),
    leftHand: mixPoint([-0.48, 0.58, 0.16], [0.08, 0.9, 0.28], grip),
    rightHand: mixPoint([0.3, 0.54, 0.1], [0.48 - finish * 0.28, 0.64 - finish * 0.2, 0.28 + toriTurn], grip),
    leftKnee: [-0.28 + entry * 0.3, 0.2, 0.26 + toriTurn],
    rightKnee: [0.2 + entry * 0.28, 0.19, 0.24 + toriTurn],
    leftFoot: [-0.42 + entry * 0.38, 0.055, 0.38 + toriTurn],
    rightFoot: [0.26 + entry * 0.32, 0.055, 0.38 + toriTurn],
  };

  const defender = {
    head: [0.42 - ukeTravel * 0.62, 1.05 + breathe + ukeLift - ukeDrop, -0.12 + ukeTilt],
    neck: [0.38 - ukeTravel * 0.56, 0.88 + ukeLift - ukeDrop * 0.95, -0.08 + ukeTilt],
    chest: [0.32 - ukeTravel * 0.5, 0.68 + ukeLift - ukeDrop * 0.86, -0.04 + ukeTilt],
    pelvis: [0.22 - ukeTravel * 0.38, 0.43 + ukeLift * 0.82 - ukeDrop * 0.55, 0.03 + ukeTilt * 0.62],
    leftShoulder: [0.13 - ukeTravel * 0.54, 0.75 + ukeLift - ukeDrop * 0.86, -0.1 + ukeTilt],
    rightShoulder: [0.52 - ukeTravel * 0.46, 0.74 + ukeLift - ukeDrop * 0.8, 0.02 + ukeTilt],
    leftHip: [0.06 - ukeTravel * 0.4, 0.44 + ukeLift * 0.8 - ukeDrop * 0.52, -0.02 + ukeTilt * 0.6],
    rightHip: [0.38 - ukeTravel * 0.32, 0.43 + ukeLift * 0.76 - ukeDrop * 0.48, 0.08 + ukeTilt * 0.56],
    leftElbow: [0.06 - finish * 0.22, 0.62 + load * 0.14 - ukeDrop * 0.7, 0.1 + ukeTilt],
    rightElbow: [0.66 - finish * 0.34, 0.62 + load * 0.1 - ukeDrop * 0.68, 0.15 + ukeTilt],
    leftHand: [0.02 - finish * 0.28, 0.5 + load * 0.12 - ukeDrop * 0.75, 0.2 + ukeTilt],
    rightHand: [0.76 - finish * 0.46, 0.48 + load * 0.1 - ukeDrop * 0.76, 0.22 + ukeTilt],
    leftKnee: [0.03 - ukeTravel * 0.42, 0.22 + load * 0.1 - ukeDrop * 0.34, 0.28 + ukeTilt * 0.54],
    rightKnee: [0.54 - ukeTravel * 0.32, 0.21 + load * 0.08 - ukeDrop * 0.32, 0.3 + ukeTilt * 0.48],
    leftFoot: [-0.08 - ukeTravel * 0.18, 0.06 + load * 0.08 - ukeDrop * 0.18, 0.36 + ukeTilt * 0.36],
    rightFoot: [0.72 - ukeTravel * 0.24, 0.06 + load * 0.06 - ukeDrop * 0.18, 0.36 + ukeTilt * 0.36],
  };

  return (
    <group position={[0.1, 0.02, -0.04]} rotation={[0, -0.42, 0]} scale={1.16}>
      <Grappler points={defender} color="#dbe4ee" headColor="#f8fafc" radius={0.04} />
      <Grappler points={attacker} color={color} radius={0.043} />
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

  const selected = MOVES[move];

  const bottom = { x: -0.4, z: 0, rotation: Math.PI / 2, pose: "neutral" };
  const top = { x: 0.4, z: 0, rotation: -Math.PI / 2, pose: "neutral" };

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} />
      <directionalLight position={[-3, 3, -2]} intensity={0.65} />

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

      {move === "choke" ? (
        <RearNakedChokeScene color={selected.color} tick={tick} />
      ) : move === "hipThrow" ? (
        <HipThrowScene color={selected.color} tick={tick} />
      ) : (
        <>
          <StickFigure {...bottom} color="#e5e7eb" scale={1.05} />
          <StickFigure {...top} color={selected.color} scale={1.05} />
        </>
      )}

      <Text position={[0, 0.04, -2.85]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.18} color="#cbd5e1" anchorX="center">
        {selected.title}
      </Text>

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        target={[0, 0.58, 0]}
        minPolarAngle={0.25}
        maxPolarAngle={1.45}
      />
    </>
  );
}

export default function App() {
  const move = "choke";
  const selected = MOVES[move];

  return (
    <main className="h-[100svh] bg-slate-950 text-white overflow-hidden">
      <section className="relative h-full w-full">
        <header className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-start justify-between gap-4 px-4 py-4 md:px-8 md:py-6">
          <div className="max-w-[min(30rem,70vw)]">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">MMA AI Trainer</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight md:text-5xl">Learn the mat visually.</h1>
          </div>
        </header>

        <div className="absolute inset-0">
          <Canvas camera={{ position: [4.9, 1.45, 0], fov: 38 }} shadows className="h-full w-full">
            <BJJMoveScene move={move} />
          </Canvas>
        </div>

        <aside className="absolute bottom-0 left-0 right-0 z-20 flex flex-col gap-2 border-t border-slate-800 bg-slate-950/88 p-2 backdrop-blur-xl sm:p-3 md:bottom-5 md:left-auto md:right-5 md:top-auto md:w-[min(340px,34vw)] md:rounded-2xl md:border">
          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 sm:p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Featured move</p>
            <h2 className="mt-1 text-xl font-black md:text-2xl">{selected.title}</h2>
            <p className="mt-1 text-sm font-medium" style={{ color: selected.color }}>{selected.subtitle}</p>
            <p className="mt-2 hidden text-xs leading-5 text-slate-300 sm:block md:text-sm md:leading-6">{selected.description}</p>
          </div>

          <div className="hidden grid-cols-3 gap-2 text-center text-xs font-bold text-slate-300 sm:grid">
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-2">Watch</div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-2">Notice</div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-2">Train</div>
          </div>

          <div className="rounded-lg border border-red-500/60 bg-red-950/75 p-2.5 sm:p-3">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-red-200">Next step</p>
            <h3 className="mt-1 text-lg font-black md:text-xl">Get live correction.</h3>
            <p className="mt-1 hidden text-xs leading-5 text-red-100 sm:block md:text-sm md:leading-6">
              Bring this move to a Gracie Barra San Diego coach and ask them to fix your first reps.
            </p>
            <a
              href="https://graciebarrasandiego.com/"
              target="_blank"
              rel="noreferrer"
              className="mt-3 block rounded-lg bg-red-600 px-4 py-2.5 text-center text-sm font-black text-white transition hover:bg-red-500 sm:py-3"
            >
              Start at Gracie Barra
            </a>
          </div>
        </aside>
      </section>
    </main>
  );
}

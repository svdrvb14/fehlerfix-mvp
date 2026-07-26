"use client";

import {
  motion,
  useReducedMotion,
  useTime,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";

type ShapeColor = "coral" | "blue" | "green";

type ShapeConfig = {
  key: string;
  kind: "blob" | "dot";
  color: ShapeColor;
  style: CSSProperties;
  // Jede Form wandert mit eigener Amplitude (relativ zur Viewport-Größe)
  // und zwei überlagerten Perioden pro Achse, damit die Bahn wie ein freies
  // Wandern über die ganze Fläche wirkt statt wie eine geschlossene
  // Kreisbahn um die eigene Achse.
  ampXRatio: number;
  ampYRatio: number;
  periodX1: number;
  periodY1: number;
  periodX2: number;
  periodY2: number;
  phase: number;
};

const BLOB_COLOR: Record<ShapeColor, string> = {
  coral: "bg-coral-light",
  blue: "bg-blue-light",
  green: "bg-green/20",
};

const DOT_COLOR: Record<ShapeColor, string> = {
  coral: "bg-coral",
  blue: "bg-blue",
  green: "bg-green",
};

// Die zwei großen Kreise (Koralle oben rechts, Hellblau unten links, beide
// bleeding über den Rand) und die drei kleinen Akzent-Punkte – exakt fünf
// Elemente, fix im DOM verankert. Es werden nie mehr erzeugt.
const SHAPES: ShapeConfig[] = [
  {
    key: "blob-coral",
    kind: "blob",
    color: "coral",
    style: {
      top: "-14rem",
      right: "-14rem",
      width: "min(38rem, 92vw)",
      height: "min(38rem, 92vw)",
    },
    ampXRatio: 0.34,
    ampYRatio: 0.3,
    periodX1: 26000,
    periodY1: 32000,
    periodX2: 41000,
    periodY2: 37000,
    phase: 0,
  },
  {
    key: "blob-blue",
    kind: "blob",
    color: "blue",
    style: {
      bottom: "-13rem",
      left: "-13rem",
      width: "min(34rem, 88vw)",
      height: "min(34rem, 88vw)",
    },
    ampXRatio: 0.3,
    ampYRatio: 0.34,
    periodX1: 29000,
    periodY1: 24000,
    periodX2: 44000,
    periodY2: 39000,
    phase: 1.3,
  },
  {
    key: "dot-green",
    kind: "dot",
    color: "green",
    style: {
      top: "7rem",
      right: "18vw",
      width: "0.9rem",
      height: "0.9rem",
    },
    ampXRatio: 0.4,
    ampYRatio: 0.38,
    periodX1: 14000,
    periodY1: 18000,
    periodX2: 23000,
    periodY2: 20000,
    phase: 2.1,
  },
  {
    key: "dot-blue",
    kind: "dot",
    color: "blue",
    style: {
      top: "13rem",
      right: "7rem",
      width: "0.7rem",
      height: "0.7rem",
    },
    ampXRatio: 0.42,
    ampYRatio: 0.36,
    periodX1: 19000,
    periodY1: 15500,
    periodX2: 27000,
    periodY2: 24000,
    phase: 0.6,
  },
  {
    key: "dot-coral",
    kind: "dot",
    color: "coral",
    style: {
      bottom: "9rem",
      left: "16vw",
      width: "1rem",
      height: "1rem",
    },
    ampXRatio: 0.38,
    ampYRatio: 0.4,
    periodX1: 21000,
    periodY1: 17000,
    periodX2: 33000,
    periodY2: 29000,
    phase: 3.4,
  },
];

function useViewportSize() {
  const [size, setSize] = useState({ width: 1280, height: 800 });

  useEffect(() => {
    function update() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return size;
}

function useWanderingAxis(
  time: MotionValue<number>,
  viewportSize: number,
  ampRatio: number,
  periodA: number,
  periodB: number,
  phase: number,
  scale: number
) {
  const amp = ampRatio * viewportSize * scale;
  const freqA = (2 * Math.PI) / periodA;
  const freqB = (2 * Math.PI) / periodB;

  return useTransform(time, (t) => {
    return (
      Math.sin(t * freqA + phase) * amp * 0.62 +
      Math.sin(t * freqB + phase * 1.8) * amp * 0.38
    );
  });
}

function MovingShape({
  shape,
  time,
  viewport,
  reducedMotion,
  scale,
}: {
  shape: ShapeConfig;
  time: MotionValue<number>;
  viewport: { width: number; height: number };
  reducedMotion: boolean;
  scale: number;
}) {
  const x = useWanderingAxis(
    time,
    viewport.width,
    shape.ampXRatio,
    shape.periodX1,
    shape.periodX2,
    shape.phase,
    scale
  );
  const y = useWanderingAxis(
    time,
    viewport.height,
    shape.ampYRatio,
    shape.periodY1,
    shape.periodY2,
    shape.phase,
    scale
  );
  const colorClass =
    shape.kind === "blob" ? BLOB_COLOR[shape.color] : DOT_COLOR[shape.color];

  if (reducedMotion) {
    return (
      <div
        aria-hidden
        className={`absolute rounded-full ${colorClass}`}
        style={shape.style}
      />
    );
  }

  return (
    <motion.div
      aria-hidden
      className={`absolute rounded-full ${colorClass}`}
      style={{ ...shape.style, x, y }}
    />
  );
}

export function LivingBackground({ subtle = false }: { subtle?: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  const time = useTime();
  const viewport = useViewportSize();
  const scale = subtle ? 0.55 : 1;

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${
        subtle ? "opacity-60" : ""
      }`}
    >
      {SHAPES.map((shape) => (
        <MovingShape
          key={shape.key}
          shape={shape}
          time={time}
          viewport={viewport}
          reducedMotion={Boolean(shouldReduceMotion)}
          scale={scale}
        />
      ))}
    </div>
  );
}

"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { CSSProperties } from "react";

type ShapeColor = "coral" | "blue" | "green";

type ShapeConfig = {
  key: string;
  kind: "blob" | "dot";
  color: ShapeColor;
  style: CSSProperties;
  // Jede Form hat eigene Amplitude/Frequenz/Phase, damit die Bewegung
  // organisch wirkt statt wie ein einheitlicher, starrer Parallax-Effekt.
  ampX: number;
  ampY: number;
  freqX: number;
  freqY: number;
  phase: number;
  drift: number;
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
    ampX: 18,
    ampY: 26,
    freqX: 0.0012,
    freqY: 0.0009,
    phase: 0,
    drift: 10,
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
    ampX: 22,
    ampY: 16,
    freqX: 0.0008,
    freqY: 0.0013,
    phase: 1.3,
    drift: 14,
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
    ampX: 14,
    ampY: 20,
    freqX: 0.002,
    freqY: 0.0016,
    phase: 2.1,
    drift: 6,
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
    ampX: 20,
    ampY: 12,
    freqX: 0.0017,
    freqY: 0.0021,
    phase: 0.6,
    drift: 8,
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
    ampX: 16,
    ampY: 18,
    freqX: 0.0022,
    freqY: 0.0011,
    phase: 3.4,
    drift: 7,
  },
];

function useOrganicAxis(
  scrollY: MotionValue<number>,
  shape: ShapeConfig,
  axis: "x" | "y",
  scale: number
) {
  const amp = (axis === "x" ? shape.ampX : shape.ampY) * scale;
  const freq = axis === "x" ? shape.freqX : shape.freqY;
  const driftAmp = shape.drift * scale;
  const driftSign = axis === "x" ? 1 : -1;

  return useTransform(scrollY, (value) => {
    const wave = Math.sin(value * freq + shape.phase) * amp;
    const drift =
      Math.sin(value * 0.0006 + shape.phase * 1.7) * driftAmp * driftSign;
    return wave + drift;
  });
}

function MovingShape({
  shape,
  scrollY,
  reducedMotion,
  scale,
}: {
  shape: ShapeConfig;
  scrollY: MotionValue<number>;
  reducedMotion: boolean;
  scale: number;
}) {
  const x = useOrganicAxis(scrollY, shape, "x", scale);
  const y = useOrganicAxis(scrollY, shape, "y", scale);
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
  const { scrollY } = useScroll();
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
          scrollY={scrollY}
          reducedMotion={Boolean(shouldReduceMotion)}
          scale={scale}
        />
      ))}
    </div>
  );
}

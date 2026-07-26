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
  // Bewegungsspielraum in Pixeln, symmetrisch um die Ruheposition. Für die
  // zwei großen Kreise (Blobs) ist er so gewählt, dass sie nie mehr als
  // ~45% aus dem Bildschirm ragen (Vorgabe: max. 50%) und sich – da sie in
  // gegenüberliegenden Ecken verankert sind – niemals überschneiden können.
  // Für die kleinen Punkte ist er so klein, dass sie bei jeder
  // Bildschirmgröße immer vollständig sichtbar bleiben.
  amp: number;
  freqX: number;
  freqY: number;
  freqX2: number;
  freqY2: number;
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

const BLOB_AMP = 40; // px – Blob bleibt bei 38rem/34rem Größe klar unter 50% Bleed
const DOT_AMP = 15; // px – Punkte bleiben auch bei schmalen Viewports voll sichtbar

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
    amp: BLOB_AMP,
    freqX: 0.0012,
    freqY: 0.0009,
    freqX2: 0.0021,
    freqY2: 0.0016,
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
    amp: BLOB_AMP,
    freqX: 0.0008,
    freqY: 0.0013,
    freqX2: 0.0017,
    freqY2: 0.0024,
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
    amp: DOT_AMP,
    freqX: 0.002,
    freqY: 0.0016,
    freqX2: 0.0032,
    freqY2: 0.0027,
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
    amp: DOT_AMP,
    freqX: 0.0017,
    freqY: 0.0021,
    freqX2: 0.0029,
    freqY2: 0.0035,
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
    amp: DOT_AMP,
    freqX: 0.0022,
    freqY: 0.0011,
    freqX2: 0.0034,
    freqY2: 0.0019,
    phase: 3.4,
  },
];

// Zwei überlagerte Sinuswellen mit Gewichten, die sich zu 1 summieren – das
// Ergebnis bleibt dadurch immer exakt innerhalb von [-amp, +amp], egal wie
// die Wellen sich überlagern. So ist die Bewegungsgrenze mathematisch
// garantiert und nicht nur "meistens" eingehalten.
function useScrollAxis(
  scrollY: MotionValue<number>,
  amp: number,
  freqA: number,
  freqB: number,
  phase: number,
  scale: number
) {
  const boundedAmp = amp * scale;
  return useTransform(scrollY, (value) => {
    const wave =
      Math.sin(value * freqA + phase) * 0.65 +
      Math.sin(value * freqB + phase * 1.8) * 0.35;
    return wave * boundedAmp;
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
  const x = useScrollAxis(
    scrollY,
    shape.amp,
    shape.freqX,
    shape.freqX2,
    shape.phase,
    scale
  );
  const y = useScrollAxis(
    scrollY,
    shape.amp,
    shape.freqY,
    shape.freqY2,
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

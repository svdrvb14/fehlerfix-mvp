"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";

type ShapeColor = "coral" | "blue" | "green";
type Unit = "rem" | "vw";
type OffsetSpec = { unit: Unit; value: number };

type ShapeConfig = {
  key: string;
  kind: "blob" | "dot";
  color: ShapeColor;
  style: CSSProperties;
  // Für die Bewegungsgrenzen wird jede Achse als "Abstand zur nächsten
  // Kante" beschrieben (in rem oder vw) – daraus wird zur Laufzeit anhand
  // der echten Fensterbreite ein Bewegungsspielraum in Pixeln berechnet.
  xOffset: OffsetSpec;
  xDir: "left" | "right";
  yOffset: OffsetSpec;
  yDir: "top" | "bottom";
  sizeRem?: number; // nur Blobs: Basis für die 50%-Bleed-Grenze
  sizeVwFrac?: number;
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
    xOffset: { unit: "rem", value: 14 },
    xDir: "right",
    yOffset: { unit: "rem", value: 14 },
    yDir: "top",
    sizeRem: 38,
    sizeVwFrac: 0.92,
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
    xOffset: { unit: "rem", value: 13 },
    xDir: "left",
    yOffset: { unit: "rem", value: 13 },
    yDir: "bottom",
    sizeRem: 34,
    sizeVwFrac: 0.88,
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
    xOffset: { unit: "vw", value: 18 },
    xDir: "right",
    yOffset: { unit: "rem", value: 7 },
    yDir: "top",
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
    xOffset: { unit: "rem", value: 7 },
    xDir: "right",
    yOffset: { unit: "rem", value: 13 },
    yDir: "top",
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
    xOffset: { unit: "vw", value: 16 },
    xDir: "left",
    yOffset: { unit: "rem", value: 9 },
    yDir: "bottom",
    freqX: 0.0022,
    freqY: 0.0011,
    freqX2: 0.0034,
    freqY2: 0.0019,
    phase: 3.4,
  },
];

function toPx(spec: OffsetSpec, viewportWidth: number): number {
  return spec.unit === "rem" ? spec.value * 16 : (spec.value / 100) * viewportWidth;
}

function useViewportWidth() {
  const [width, setWidth] = useState(1280);

  useEffect(() => {
    function update() {
      setWidth(window.innerWidth);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return width;
}

// Zwei überlagerte Sinuswellen mit Gewichten, die sich zu 1 summieren – das
// Ergebnis bleibt dadurch immer exakt innerhalb von [min, max], egal wie
// sich die Wellen überlagern.
function useScrollAxis(
  scrollY: MotionValue<number>,
  min: number,
  max: number,
  freqA: number,
  freqB: number,
  phase: number
) {
  const center = (min + max) / 2;
  const half = (max - min) / 2;

  return useTransform(scrollY, (value) => {
    const wave =
      Math.sin(value * freqA + phase) * 0.65 +
      Math.sin(value * freqB + phase * 1.8) * 0.35;
    return center + wave * half;
  });
}

// Bewegungsgrenzen je Achse: "outward" = weiter aus dem Bildschirm heraus,
// "inward" = weiter hinein Richtung Bildschirmmitte.
function useAxisRange(
  shape: ShapeConfig,
  dir: "left" | "right" | "top" | "bottom",
  offset: OffsetSpec,
  viewportWidth: number,
  scale: number
): [number, number] {
  const offsetPx = toPx(offset, viewportWidth);

  if (shape.kind === "blob") {
    const sizePx = Math.min(
      (shape.sizeRem ?? 0) * 16,
      (shape.sizeVwFrac ?? 1) * viewportWidth
    );
    // Maximal 50% des Kreises darf aus dem Bildschirm ragen.
    const outward = Math.max(0, 0.5 * sizePx - offsetPx) * scale;
    // Heuristischer Puffer gegen Überlappung der beiden großen Kreise:
    // sie dürfen sich deutlich bewegen, aber nicht zu weit Richtung Mitte.
    const inward = 0.35 * sizePx * scale;

    if (dir === "right") return [-inward, outward]; // + = weiter nach rechts raus
    if (dir === "left") return [-outward, inward]; // - = weiter nach links raus
    if (dir === "top") return [-outward, inward]; // - = weiter nach oben raus
    return [-inward, outward]; // bottom: + = weiter nach unten raus
  }

  // Punkte: dürfen nie ganz verschwinden – Bewegung bleibt innerhalb von
  // 85% des Abstands zur jeweils nächsten Kante, symmetrisch in beide
  // Richtungen (die gegenüberliegende Kante ist immer deutlich weiter weg).
  const budget = offsetPx * 0.85 * scale;
  return [-budget, budget];
}

function MovingShape({
  shape,
  scrollY,
  reducedMotion,
  scale,
  viewportWidth,
}: {
  shape: ShapeConfig;
  scrollY: MotionValue<number>;
  reducedMotion: boolean;
  scale: number;
  viewportWidth: number;
}) {
  const [xMin, xMax] = useAxisRange(
    shape,
    shape.xDir,
    shape.xOffset,
    viewportWidth,
    scale
  );
  const [yMin, yMax] = useAxisRange(
    shape,
    shape.yDir,
    shape.yOffset,
    viewportWidth,
    scale
  );
  const x = useScrollAxis(scrollY, xMin, xMax, shape.freqX, shape.freqX2, shape.phase);
  const y = useScrollAxis(scrollY, yMin, yMax, shape.freqY, shape.freqY2, shape.phase);
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
  const viewportWidth = useViewportWidth();
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
          viewportWidth={viewportWidth}
        />
      ))}
    </div>
  );
}

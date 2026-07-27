"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useState } from "react";
import { CARD_SIDE } from "./WhyHowWhat";
import { PencilDoodle } from "./PencilDoodle";

type Point = { x: number; y: number };
type Side = "left" | "right";

type SegmentDef = { fromId: string; toId: string; side: Side };

// Vom Ausgangstext im Hero über Warum/Wie/Was – bewusst kein Segment mehr
// zum Team-Abschnitt.
const SEGMENT_DEFS: SegmentDef[] = [
  { fromId: "hero-journey-start", toId: "warum", side: "left" },
  { fromId: "warum", toId: "wie", side: "right" },
  { fromId: "wie", toId: "was", side: "left" },
];

const MIN_VIEWPORT_WIDTH = 768; // unter md wird gestapelt statt versetzt, keine Linie
// Jedes Segment zeichnet nur bis 3/4 seiner Kurve – die Linie soll vor der
// nächsten Textbox aufhören, statt sie zu erreichen/zu überlappen.
const STOP_FRACTION = 0.75;

type Segment = {
  id: string;
  p0: Point;
  c1: Point;
  c2: Point;
  p1: Point;
  side: Side;
};

function bottomCenterOf(id: string): Point | null {
  const el = document.getElementById(id);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const scrollY = window.scrollY;
  return { x: rect.left + rect.width / 2, y: rect.bottom + scrollY };
}

function topCornerOf(id: string, side: Side): Point | null {
  const el = document.getElementById(id);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const scrollY = window.scrollY;
  const x = side === "left" ? rect.left : rect.right;
  return { x, y: rect.top + scrollY };
}

// Jedes Segment beginnt an der UNTERKANTE der vorherigen Karte (bzw. am
// Hero-Anker) statt an ihrer Ankunfts-Ecke – so verläuft die Kurve immer
// im Zwischenraum zwischen zwei Boxen und kreuzt nie deren Fläche.
function buildSegments(): Segment[] | null {
  const segments: Segment[] = [];

  for (const def of SEGMENT_DEFS) {
    const p0 = bottomCenterOf(def.fromId);
    const p1 = topCornerOf(def.toId, CARD_SIDE[def.toId] ?? def.side);
    if (!p0 || !p1) return null;

    const dy = p1.y - p0.y;
    const c1 = { x: p0.x, y: p0.y + dy * 0.55 };
    const c2 = { x: p1.x, y: p0.y + dy * 0.45 };

    segments.push({ id: def.toId, p0, c1, c2, p1, side: def.side });
  }
  return segments;
}

function cubicPoint(p0: Point, c1: Point, c2: Point, p1: Point, t: number): Point {
  const mt = 1 - t;
  const w0 = mt * mt * mt;
  const w1 = 3 * mt * mt * t;
  const w2 = 3 * mt * t * t;
  const w3 = t * t * t;
  return {
    x: w0 * p0.x + w1 * c1.x + w2 * c2.x + w3 * p1.x,
    y: w0 * p0.y + w1 * c1.y + w2 * c2.y + w3 * p1.y,
  };
}

function segmentPathD(seg: Segment): string {
  return `M ${seg.p0.x} ${seg.p0.y} C ${seg.c1.x} ${seg.c1.y}, ${seg.c2.x} ${seg.c2.y}, ${seg.p1.x} ${seg.p1.y}`;
}

export function JourneyPath() {
  const shouldReduceMotion = useReducedMotion();
  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [docHeight, setDocHeight] = useState(0);
  const { scrollY } = useScroll();

  useEffect(() => {
    function measure() {
      if (window.innerWidth < MIN_VIEWPORT_WIDTH) {
        setSegments(null);
        return;
      }
      setSegments(buildSegments());
      setDocHeight(document.documentElement.scrollHeight);
    }

    measure();
    // Bilder/Fonts können die Kartenposition nach dem ersten Messen noch
    // verschieben – daher ein paar verzögerte Nachmessungen.
    const timeouts = [100, 500, 1500].map((delay) => window.setTimeout(measure, delay));
    window.addEventListener("resize", measure);
    return () => {
      timeouts.forEach(window.clearTimeout);
      window.removeEventListener("resize", measure);
    };
  }, []);

  if (!segments) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-[2]"
      style={{ height: docHeight }}
    >
      <svg className="h-full w-full overflow-visible" style={{ position: "absolute", inset: 0 }}>
        {segments.map((seg) => (
          <SegmentStroke
            key={seg.id}
            seg={seg}
            scrollY={scrollY}
            reduced={Boolean(shouldReduceMotion)}
          />
        ))}
      </svg>

      {segments.map((seg) => (
        <SegmentPencil
          key={seg.id}
          seg={seg}
          scrollY={scrollY}
          reduced={Boolean(shouldReduceMotion)}
        />
      ))}
    </div>
  );
}

function SegmentStroke({
  seg,
  scrollY,
  reduced,
}: {
  seg: Segment;
  scrollY: MotionValue<number>;
  reduced: boolean;
}) {
  const viewportOffset = typeof window !== "undefined" ? window.innerHeight : 800;
  // Erst kurz nachdem die vorherige Box (die bis eben im Fokus stand) fast
  // aus dem Bild gescrollt ist, fängt die nächste Linie an zu erscheinen –
  // nicht schon, während man die vorherige Box noch liest.
  const drawStart = seg.p0.y - viewportOffset * 0.12;
  const drawEnd = seg.p1.y - viewportOffset * 0.35;

  const dashOffset = useTransform(scrollY, [drawStart, drawEnd], [1, 1 - STOP_FRACTION], {
    clamp: true,
  });

  return (
    <motion.path
      d={segmentPathD(seg)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      className="text-ink/70"
      pathLength={1}
      strokeDasharray={1}
      style={{ strokeDashoffset: reduced ? 1 - STOP_FRACTION : dashOffset }}
    />
  );
}

function SegmentPencil({
  seg,
  scrollY,
  reduced,
}: {
  seg: Segment;
  scrollY: MotionValue<number>;
  reduced: boolean;
}) {
  const viewportOffset = typeof window !== "undefined" ? window.innerHeight : 800;
  // Gleicher Schwellenwert wie das Ende der 75%-Zeichnung in SegmentStroke,
  // damit der Stift exakt dort erscheint, wo die Linie stoppt.
  const triggerY = seg.p1.y - viewportOffset * 0.35;
  const point = cubicPoint(seg.p0, seg.c1, seg.c2, seg.p1, STOP_FRACTION);

  const opacity = useTransform(scrollY, [triggerY - 60, triggerY], [0, 1], { clamp: true });
  const scale = useTransform(scrollY, [triggerY - 60, triggerY], [0.6, 1], { clamp: true });

  return (
    <motion.div
      className="absolute"
      style={{
        left: point.x,
        top: point.y,
        opacity: reduced ? 1 : opacity,
        scale: reduced ? 1 : scale,
        x: seg.side === "left" ? "-25%" : "-75%",
        y: "-60%",
      }}
    >
      <PencilDoodle flip={seg.side === "right"} className="h-14 w-16 sm:h-16 sm:w-20" />
    </motion.div>
  );
}

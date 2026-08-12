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
import { centerLockY, PENCIL_FADE_PX, pencilTriggerY } from "./journeyTiming";
import { useJourneyScrollLock } from "./useJourneyScrollLock";

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

const CARD_IDS = ["warum", "wie", "was"] as const;

const MIN_VIEWPORT_WIDTH = 768; // unter md wird gestapelt statt versetzt, keine Linie
// Jedes Segment zeichnet nur bis 3/4 seiner Kurve – die Linie soll vor der
// nächsten Textbox aufhören, statt sie zu erreichen/zu überlappen.
const STOP_FRACTION = 0.75;
// Anteile von Gesamt-Breite/-Höhe des Segments, an denen die beiden
// Kontrollpunkte sitzen: der erste hält die Linie kurz nach dem Start noch
// fast senkrecht, der große seitliche Schwung passiert in der Mitte, und
// die letzten ~30% der Höhe sind ein steilerer (aber nicht ganz
// senkrechter) Einlauf in die Zielecke.
const DEPARTURE_X_FRACTION = 0.03;
const DEPARTURE_Y_FRACTION = 0.3;
const ARRIVAL_X_FRACTION = 0.92;
const ARRIVAL_Y_FRACTION = 0.68;

type Segment = {
  id: string;
  p0: Point;
  c1: Point;
  c2: Point;
  p1: Point;
  p1Height: number;
  side: Side;
};

function bottomCenterOf(id: string): Point | null {
  const el = document.getElementById(id);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const scrollY = window.scrollY;
  return { x: rect.left + rect.width / 2, y: rect.bottom + scrollY };
}

function topCornerOf(id: string, side: Side): (Point & { height: number }) | null {
  const el = document.getElementById(id);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const scrollY = window.scrollY;
  const x = side === "left" ? rect.left : rect.right;
  return { x, y: rect.top + scrollY, height: rect.height };
}

// Jedes Segment beginnt an der UNTERKANTE der vorherigen Karte (bzw. am
// Hero-Anker) statt an ihrer Ankunfts-Ecke – so verläuft die Kurve immer
// im Zwischenraum zwischen zwei Boxen und kreuzt nie deren Fläche.
function buildSegments(): Segment[] | null {
  const segments: Segment[] = [];

  for (const def of SEGMENT_DEFS) {
    const p0 = bottomCenterOf(def.fromId);
    const side = CARD_SIDE[def.toId] ?? def.side;
    const target = topCornerOf(def.toId, side);
    if (!p0 || !target) return null;
    const { height, ...p1 } = target;

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const c1 = {
      x: p0.x + dx * DEPARTURE_X_FRACTION,
      y: p0.y + dy * DEPARTURE_Y_FRACTION,
    };
    const c2 = {
      x: p0.x + dx * ARRIVAL_X_FRACTION,
      y: p0.y + dy * ARRIVAL_Y_FRACTION,
    };

    segments.push({ id: def.toId, p0, c1, c2, p1, p1Height: height, side: def.side });
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

// Ableitung der kubischen Bézier-Kurve bei t, normiert auf Länge 1 - zeigt
// exakt in die Richtung, in die die Linie an diesem Punkt gerade verläuft.
function cubicTangent(p0: Point, c1: Point, c2: Point, p1: Point, t: number): Point {
  const mt = 1 - t;
  const dx = 3 * mt * mt * (c1.x - p0.x) + 6 * mt * t * (c2.x - c1.x) + 3 * t * t * (p1.x - c2.x);
  const dy = 3 * mt * mt * (c1.y - p0.y) + 6 * mt * t * (c2.y - c1.y) + 3 * t * t * (p1.y - c2.y);
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

// Der Stift soll nicht genau am gezeichneten Linienende sitzen (das wirkt
// wie "in der Linie drin"), sondern ein kleines, aber sichtbares Stück
// dahinter ansetzen - in exakt der Richtung, in die die Linie an ihrem
// Stopp-Punkt gerade zeigt. So bleibt der kleine Lücken-Effekt bei allen
// drei Segmenten korrekt, egal wie ihr Kurvenwinkel dort verläuft.
const PENCIL_GAP_PX = 16;
// Das erste Segment (Hero -> Warum) hat eine deutlich kürzere/steilere Kurve
// als die Segmente zwischen den Karten (andere Distanz, anderer Winkel). Der
// Stift wird nie rotiert, daher reicht dort der Standard-Abstand nicht aus -
// die Linie läuft optisch in die feste Stift-Grafik hinein. Für dieses eine
// Segment deshalb ein größerer Abstand.
const PENCIL_GAP_OVERRIDES: Record<string, number> = { warum: 46 };

function pencilAnchor(seg: Segment): Point {
  const point = cubicPoint(seg.p0, seg.c1, seg.c2, seg.p1, STOP_FRACTION);
  const tangent = cubicTangent(seg.p0, seg.c1, seg.c2, seg.p1, STOP_FRACTION);
  const gap = PENCIL_GAP_OVERRIDES[seg.id] ?? PENCIL_GAP_PX;
  return {
    x: point.x + tangent.x * gap,
    y: point.y + tangent.y * gap,
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

  useJourneyScrollLock(CARD_IDS, !shouldReduceMotion);

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

  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-[2]"
      style={{ height: docHeight }}
    >
      <svg className="h-full w-full overflow-visible" style={{ position: "absolute", inset: 0 }}>
        {segments.map((seg, index) => {
          // Das allererste Segment (vom Hero-Text) soll sofort beim
          // Losscrollen zeichnen, ganz ohne Anlauf-Pause. Jedes weitere
          // Segment darf erst starten, sobald der Bildschirm bei der
          // vorherigen Karte eingerastet war (und man weiterscrollt).
          const prev = segments[index - 1];
          const drawStart =
            index === 0 ? 0 : centerLockY(prev.p1.y, prev.p1Height, viewportHeight);
          const drawEnd = pencilTriggerY(seg.p1.y, seg.p1Height, viewportHeight);

          return (
            <SegmentStroke
              key={seg.id}
              seg={seg}
              scrollY={scrollY}
              drawStart={drawStart}
              drawEnd={drawEnd}
              reduced={Boolean(shouldReduceMotion)}
            />
          );
        })}
      </svg>

      {segments.map((seg) => (
        <SegmentPencil
          key={seg.id}
          seg={seg}
          scrollY={scrollY}
          viewportHeight={viewportHeight}
          reduced={Boolean(shouldReduceMotion)}
        />
      ))}
    </div>
  );
}

function SegmentStroke({
  seg,
  scrollY,
  drawStart,
  drawEnd,
  reduced,
}: {
  seg: Segment;
  scrollY: MotionValue<number>;
  drawStart: number;
  drawEnd: number;
  reduced: boolean;
}) {
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
  viewportHeight,
  reduced,
}: {
  seg: Segment;
  scrollY: MotionValue<number>;
  viewportHeight: number;
  reduced: boolean;
}) {
  const triggerY = pencilTriggerY(seg.p1.y, seg.p1Height, viewportHeight);
  const point = pencilAnchor(seg);

  const opacity = useTransform(scrollY, [triggerY - PENCIL_FADE_PX, triggerY], [0, 1], {
    clamp: true,
  });
  const scale = useTransform(scrollY, [triggerY - PENCIL_FADE_PX, triggerY], [0.6, 1], {
    clamp: true,
  });

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
      {/* Stift bleibt immer in Originalausrichtung wie im Logo, nie
          gespiegelt. */}
      <PencilDoodle className="h-14 w-16 sm:h-16 sm:w-20" />
    </motion.div>
  );
}

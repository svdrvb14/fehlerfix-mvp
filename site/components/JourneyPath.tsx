"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { CARD_SIDE } from "./WhyHowWhat";
import { PencilDoodle } from "./PencilDoodle";

type Point = { x: number; y: number };

// Reihenfolge der Wegpunkte: vom Ausgangstext im Hero über Warum/Wie/Was.
// Zum Team-Abschnitt führt bewusst keine Linie mehr.
const WAYPOINT_IDS = ["hero-journey-start", "warum", "wie", "was"] as const;
const MIN_VIEWPORT_WIDTH = 768; // unter md wird gestapelt statt versetzt, keine Linie nötig

function measurePoints(): Point[] | null {
  const els = WAYPOINT_IDS.map((id) => document.getElementById(id));
  if (els.some((el) => !el)) return null;

  const scrollY = window.scrollY;

  return els.map((el, index) => {
    const rect = el!.getBoundingClientRect();
    const id = WAYPOINT_IDS[index];

    if (id === "hero-journey-start") {
      return { x: rect.left + rect.width / 2, y: rect.bottom + scrollY };
    }

    const side = CARD_SIDE[id];
    const x = side === "left" ? rect.left : rect.right;
    return { x, y: rect.top + scrollY };
  });
}

// Baut eine sanfte, geschwungene Verbindung aus kubischen Bezier-Segmenten:
// Jedes Segment nutzt die Ausgangs-x-Position beider Endpunkte als
// Kontrollpunkte auf halber Höhe, wodurch ein natürlicher S-Schwung
// zwischen linken und rechten Ankern entsteht statt einer geraden Linie.
function buildPathD(points: Point[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const dy = p1.y - p0.y;
    const c1 = { x: p0.x, y: p0.y + dy * 0.55 };
    const c2 = { x: p1.x, y: p0.y + dy * 0.45 };
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export function JourneyPath() {
  const shouldReduceMotion = useReducedMotion();
  const [points, setPoints] = useState<Point[] | null>(null);
  const [docHeight, setDocHeight] = useState(0);
  const { scrollY } = useScroll();

  useEffect(() => {
    function measure() {
      if (window.innerWidth < MIN_VIEWPORT_WIDTH) {
        setPoints(null);
        return;
      }
      setPoints(measurePoints());
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

  const viewportOffset = typeof window !== "undefined" ? window.innerHeight : 800;
  const start = points?.[0] ?? { x: 0, y: 0 };
  const end = points?.[points.length - 1] ?? { x: 0, y: 1 };
  const drawStart = start.y - viewportOffset * 0.75;
  const drawEnd = end.y - viewportOffset * 0.35;

  // Immer aufrufen (Rules of Hooks) – der Rückgabewert wird erst unten
  // verwendet, sobald `points` feststeht.
  const dashOffset = useTransform(scrollY, [drawStart, drawEnd], [1, 0], { clamp: true });

  if (!points) return null;

  const pathD = buildPathD(points);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-[2]"
      style={{ height: docHeight }}
    >
      <svg className="h-full w-full overflow-visible" style={{ position: "absolute", inset: 0 }}>
        <motion.path
          d={pathD}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          className="text-ink/70"
          pathLength={1}
          strokeDasharray={1}
          style={{ strokeDashoffset: shouldReduceMotion ? 0 : dashOffset }}
        />
      </svg>

      {points.slice(1).map((point, index) => {
        const id = WAYPOINT_IDS[index + 1];
        const side = CARD_SIDE[id];
        const triggerY = point.y - viewportOffset * 0.75;

        return (
          <PencilAtPoint
            key={id}
            point={point}
            side={side}
            scrollY={scrollY}
            triggerY={triggerY}
            reduced={Boolean(shouldReduceMotion)}
          />
        );
      })}
    </div>
  );
}

function PencilAtPoint({
  point,
  side,
  scrollY,
  triggerY,
  reduced,
}: {
  point: Point;
  side: "left" | "right";
  scrollY: ReturnType<typeof useScroll>["scrollY"];
  triggerY: number;
  reduced: boolean;
}) {
  const opacity = useTransform(scrollY, [triggerY - 40, triggerY], [0, 1], { clamp: true });
  const scale = useTransform(scrollY, [triggerY - 40, triggerY], [0.6, 1], { clamp: true });

  return (
    <motion.div
      className="absolute"
      style={{
        left: point.x,
        top: point.y,
        opacity: reduced ? 1 : opacity,
        scale: reduced ? 1 : scale,
        x: side === "left" ? "-38%" : "-62%",
        y: "-58%",
      }}
    >
      <PencilDoodle flip={side === "right"} className="h-14 w-16 sm:h-16 sm:w-20" />
    </motion.div>
  );
}

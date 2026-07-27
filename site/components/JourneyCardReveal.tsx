"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Muss mit dem Stift-Auslösepunkt in JourneyPath.tsx übereinstimmen (dort:
// `seg.p1.y - viewportOffset * 0.35`), damit die Box garantiert erst NACH
// dem Stift erscheint, nie gleichzeitig oder davor.
const PENCIL_TRIGGER_VH_FRACTION = 0.35;
// Kleiner Puffer, damit zwischen "Stift fertig" und "Box beginnt" ein
// spürbarer, wenn auch winziger Abstand liegt statt eines harten Cuts.
const PENCIL_TO_BOX_GAP_PX = 20;
// Scroll-Distanz, über die die Box selbst einblendet ("einrastet").
const BOX_FADE_PX = 170;

export function JourneyCardReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const [triggerY, setTriggerY] = useState<number | null>(null);

  useEffect(() => {
    function measure() {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      setTriggerY(rect.top + window.scrollY - vh * PENCIL_TRIGGER_VH_FRACTION);
    }

    measure();
    // Bilder/Fonts können die Position nach dem ersten Messen noch
    // verschieben – daher ein paar verzögerte Nachmessungen.
    const timeouts = [100, 500, 1500].map((delay) => window.setTimeout(measure, delay));
    window.addEventListener("resize", measure);
    return () => {
      timeouts.forEach(window.clearTimeout);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const boxStart = (triggerY ?? 0) + PENCIL_TO_BOX_GAP_PX;
  const boxEnd = boxStart + BOX_FADE_PX;

  const opacity = useTransform(scrollY, [boxStart, boxEnd], [0, 1], { clamp: true });
  const y = useTransform(scrollY, [boxStart, boxEnd], [28, 0], { clamp: true });

  if (shouldReduceMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={triggerY === null ? { opacity: 0 } : { opacity, y }}
    >
      {children}
    </motion.div>
  );
}

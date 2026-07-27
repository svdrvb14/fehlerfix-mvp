"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { boxRevealEnd, boxRevealStart } from "./journeyTiming";

export function JourneyCardReveal({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  // Die Positionsmessung (für JourneyPath-Linie, Stift und Scroll-Lock, die
  // alle per document.getElementById(id) auf diesen äußeren Wrapper
  // zugreifen) sitzt bewusst auf einem Element OHNE Transform. Würde die
  // Ein-/Ausblend-Animation (Opacity + y) direkt auf das Element mit der id
  // liegen, würde jede Messung während der Animation die noch nicht
  // abgeschlossene Verschiebung mit einrechnen und die Karte am Ende leicht
  // versetzt zur Bildschirmmitte einrasten lassen.
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const [cardTopY, setCardTopY] = useState<number | null>(null);
  const [cardHeight, setCardHeight] = useState(0);

  useEffect(() => {
    function measure() {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setCardTopY(rect.top + window.scrollY);
      setCardHeight(rect.height);
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

  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const boxStart = boxRevealStart(cardTopY ?? 0, cardHeight, viewportHeight);
  const boxEnd = boxRevealEnd(cardTopY ?? 0, cardHeight, viewportHeight);

  const opacity = useTransform(scrollY, [boxStart, boxEnd], [0, 1], { clamp: true });
  const y = useTransform(scrollY, [boxStart, boxEnd], [28, 0], { clamp: true });

  if (shouldReduceMotion) {
    return (
      <div ref={ref} id={id} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} id={id} className={className}>
      <motion.div style={cardTopY === null ? { opacity: 0 } : { opacity, y }}>
        {children}
      </motion.div>
    </div>
  );
}

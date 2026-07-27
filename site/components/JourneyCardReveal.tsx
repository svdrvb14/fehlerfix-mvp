"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { boxRevealEnd, boxRevealStart } from "./journeyTiming";

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
  const [cardTopY, setCardTopY] = useState<number | null>(null);

  useEffect(() => {
    function measure() {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setCardTopY(rect.top + window.scrollY);
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
  const boxStart = boxRevealStart(cardTopY ?? 0, viewportHeight);
  const boxEnd = boxRevealEnd(cardTopY ?? 0, viewportHeight);

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
      style={cardTopY === null ? { opacity: 0 } : { opacity, y }}
    >
      {children}
    </motion.div>
  );
}

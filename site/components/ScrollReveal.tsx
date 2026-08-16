"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function ScrollReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // whileInView mit once:false triggert die Ein-/Ausblend-Animation exakt
  // bei jedem Über-/Unterschreiten der Sichtbarkeitsgrenze neu. Bleibt der
  // Scroll (oder das Momentum-Ausklingen) genau dort stehen, kippt der
  // IntersectionObserver bei jedem Mini-Ruckler hin und her - die Animation
  // startet dutzende Male pro Sekunde neu, statt einmal sauber durchzulaufen.
  // Das ist genau das gemeldete Wackeln/Geisterbild. Deshalb hier nicht auf
  // jeden rohen Wechsel reagieren, sondern erst, wenn der Sichtbarkeits-
  // status kurz stabil geblieben ist - ein winziges Zittern an der Grenze
  // wird so geschluckt, ein echter, bewusster Scroll löst weiterhin sauber
  // aus (nur mit minimaler, nicht wahrnehmbarer Verzögerung).
  const rawInView = useInView(ref, { once: false, margin: "-15% 0px -15% 0px" });
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setRevealed(rawInView), 120);
    return () => clearTimeout(timeout);
  }, [rawInView]);

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
      initial={{ opacity: 0, y: 32, scale: 0.98 }}
      animate={revealed ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 32, scale: 0.98 }}
      // Kritisch gedämpfte Feder statt fester Kurve: kein Überschwingen,
      // da der Einblendung keine Nutzer-Geste mit Schwung vorausgeht.
      transition={{ type: "spring", bounce: 0, duration: 0.6, delay }}
    >
      {children}
    </motion.div>
  );
}

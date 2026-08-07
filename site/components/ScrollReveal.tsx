"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

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

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 32, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: false, margin: "-80px" }}
      // Kritisch gedämpfte Feder statt fester Kurve: kein Überschwingen,
      // da der Einblendung keine Nutzer-Geste mit Schwung vorausgeht.
      transition={{ type: "spring", bounce: 0, duration: 0.6, delay }}
    >
      {children}
    </motion.div>
  );
}

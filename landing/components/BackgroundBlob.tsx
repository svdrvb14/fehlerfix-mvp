"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

type BlobProps = {
  color: "coral" | "blue";
  className: string;
  speed?: number;
};

export function BackgroundBlob({ color, className, speed = 0.12 }: BlobProps) {
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, (value) => (shouldReduceMotion ? 0 : value * speed));

  const bg = color === "coral" ? "bg-coral-light" : "bg-blue-light";

  return (
    <motion.div
      aria-hidden
      style={{ y }}
      className={`pointer-events-none absolute -z-10 rounded-full ${bg} ${className}`}
    />
  );
}

type DotProps = {
  color: "coral" | "blue" | "green";
  className: string;
};

export function AccentDot({ color, className }: DotProps) {
  const bg =
    color === "coral" ? "bg-coral" : color === "blue" ? "bg-blue" : "bg-green";

  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute -z-10 rounded-full ${bg} ${className}`}
    />
  );
}

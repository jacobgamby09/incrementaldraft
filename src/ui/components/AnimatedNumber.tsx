import { motion, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";

/** Fjeder-animeret tal — DESIGN.md's "tal der ticker levende". */
export function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 140, damping: 22 });
  useEffect(() => {
    spring.set(value);
  }, [spring, value]);
  const display = useTransform(spring, (v) => Math.round(v).toString());
  return <motion.span>{display}</motion.span>;
}

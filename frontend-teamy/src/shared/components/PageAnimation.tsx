import type { ReactNode } from "react";
import { motion } from "motion/react";
import { useLocation } from "react-router-dom";

export function PageAnimation({ children, className = "" }: { children: ReactNode; className?: string }) {
  const location = useLocation();

  return (
    <motion.div key={location.pathname} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";

type AnimatedModalProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  onBackdropClick?: () => void;
};

const modalEase = [0.16, 1, 0.3, 1] as const;

export function AnimatedModal({ children, className = "z-70", contentClassName = "", onBackdropClick }: AnimatedModalProps) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <motion.div
      animate={{ opacity: 1 }}
      className={`fixed inset-0 z-70 flex min-h-full w-full items-center justify-center overflow-x-hidden overflow-y-auto overscroll-contain bg-black/80 p-2 backdrop-blur-md sm:p-4 ${className}`}
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onBackdropClick?.();
        }
      }}
      transition={{ duration: 0.18, ease: modalEase }}
    >
      <motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`mx-auto flex w-full max-w-full min-w-0 items-center justify-center ${contentClassName}`}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        initial={{ opacity: 0, scale: 0.97, y: 14 }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onBackdropClick?.();
          }
        }}
        transition={{ duration: 0.26, ease: modalEase }}
      >
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  );
}


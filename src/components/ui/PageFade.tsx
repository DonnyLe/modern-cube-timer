import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export function PageFade({
  children,
  pageKey,
  initial = true,
}: {
  children: ReactNode;
  pageKey: string;
  initial?: boolean;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={initial}>
      <motion.div
        key={pageKey}
        className="page-fade"
        initial={{ opacity: reducedMotion ? 1 : 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: reducedMotion ? 0 : 0.08 } }}
        transition={{ duration: reducedMotion ? 0 : 0.16, ease: [0.23, 1, 0.32, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

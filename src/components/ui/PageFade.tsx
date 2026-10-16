import type { ReactNode } from 'react';
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
  type Transition,
} from 'motion/react';

type PageFadeProps = {
  children: ReactNode;
  pageKey: string;
  initial?: boolean;
  enterReady?: boolean;
  transition?: Transition;
};

export function PageFade({
  children,
  pageKey,
  initial = true,
  enterReady = true,
  transition,
}: PageFadeProps) {
  return (
    <div className="page-fade-stack">
      <AnimatePresence initial={initial}>
        <FadeContent
          key={pageKey}
          pageKey={pageKey}
          enterReady={enterReady}
          transition={transition}
        >
          {children}
        </FadeContent>
      </AnimatePresence>
    </div>
  );
}

function FadeContent({ children, enterReady = true, transition }: PageFadeProps) {
  const reducedMotion = useReducedMotion();
  const present = useIsPresent();

  return (
    <motion.div
      className="page-fade"
      aria-hidden={present ? undefined : true}
      inert={!present}
      initial={{ opacity: reducedMotion && enterReady ? 1 : 0 }}
      animate={{ opacity: enterReady ? 1 : 0 }}
      exit={{ opacity: 0, transition: { duration: reducedMotion ? 0 : 0.08 } }}
      transition={
        reducedMotion ? { duration: 0 } : transition || { duration: 0.16, ease: [0.23, 1, 0.32, 1] }
      }
    >
      {children}
    </motion.div>
  );
}

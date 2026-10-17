import type { ReactNode } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { portalContainer } from './portal';

export function Dialog({
  open,
  title,
  onClose,
  children,
  wide = false,
  allowOverflow = false,
  className = '',
  onEntered,
  onExited,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  allowOverflow?: boolean;
  className?: string;
  onEntered?: () => void;
  onExited?: () => void;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <MotionConfig reducedMotion="user">
        {/* AnimatePresence keeps the last content rendered while the exit plays. */}
        <AnimatePresence onExitComplete={onExited}>
          {open && (
            <DialogPrimitive.Portal keepMounted container={portalContainer}>
              <DialogPrimitive.Backdrop
                className="dialog-backdrop"
                render={
                  <motion.div
                    initial={{ opacity: reducedMotion ? 1 : 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.2, ease: 'easeOut' }}
                  />
                }
              />
              <DialogPrimitive.Popup
                finalFocus={false}
                className={`dialog${wide ? ' wide' : ''}${allowOverflow ? ' dialog-overflow' : ''} ${className}`}
                render={
                  <motion.div
                    initial={{
                      opacity: reducedMotion ? 1 : 0,
                      y: reducedMotion ? 0 : 8,
                      scale: reducedMotion ? 1 : 0.97,
                    }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{
                      opacity: 0,
                      y: 4,
                      scale: 0.98,
                      transition: { duration: reducedMotion ? 0 : 0.15 },
                    }}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }
                    }
                    onAnimationComplete={(animation) => {
                      if (
                        typeof animation === 'object' &&
                        'opacity' in animation &&
                        animation.opacity === 1
                      )
                        onEntered?.();
                    }}
                  />
                }
              >
                <div className="dialog-content">
                  <header>
                    <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
                    <DialogPrimitive.Close className="icon-button" aria-label="Close dialog">
                      <X size={20} />
                    </DialogPrimitive.Close>
                  </header>
                  {children}
                </div>
              </DialogPrimitive.Popup>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </MotionConfig>
    </DialogPrimitive.Root>
  );
}

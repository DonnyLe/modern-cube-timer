import type { ReactNode } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
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
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  allowOverflow?: boolean;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <MotionConfig reducedMotion="user">
        {/* AnimatePresence keeps the last content rendered while the exit plays. */}
        <AnimatePresence>
          {open && (
            <DialogPrimitive.Portal keepMounted container={portalContainer}>
              <DialogPrimitive.Backdrop
                className="dialog-backdrop"
                render={
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  />
                }
              />
              <DialogPrimitive.Popup
                finalFocus={() => {
                  // A ref would focus the parent's first tabbable child instead of the parent.
                  queueMicrotask(() => portalContainer.current?.focus({ preventScroll: true }));

                  return false;
                }}
                className={`dialog${wide ? ' wide' : ''}${allowOverflow ? ' dialog-overflow' : ''} ${className}`}
                render={
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98, transition: { duration: 0.15 } }}
                    transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
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

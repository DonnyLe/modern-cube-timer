import { useCallback, useState } from 'react';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { MotionConfig, motion, type HTMLMotionProps } from 'motion/react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { portalContainer } from './portal';

const hidden = { opacity: 0, y: -4, scale: 0.98 };
const shown = { opacity: 1, y: 0, scale: 1 };

export function Select<Value extends string>({
  label,
  value,
  options,
  disabled,
  onValueChange,
}: {
  label: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  disabled?: boolean;
  onValueChange: (value: Value) => void;
}) {
  const [dialog, setDialog] = useState<HTMLElement | null>(null);
  const attachTrigger = useCallback((element: HTMLButtonElement | null) => {
    // Keep the menu inside an open dialog so the dialog never treats it as outside content.
    if (element) setDialog(element.closest<HTMLElement>('[role="dialog"]'));
  }, []);

  return (
    <SelectPrimitive.Root
      value={value}
      items={options}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next);
      }}
    >
      <SelectPrimitive.Trigger
        ref={attachTrigger}
        className="custom-select-trigger"
        aria-label={label}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon className="custom-select-icon">
          <ChevronDown size={16} aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal container={dialog ?? portalContainer}>
        <SelectPrimitive.Positioner
          className="custom-select-positioner"
          alignItemWithTrigger={false}
          align="start"
          sideOffset={8}
          collisionPadding={16}
        >
          <MotionConfig reducedMotion="user">
            <SelectPrimitive.Popup
              className="custom-select-content"
              // The popup stays mounted after first use, so animate toward the open state
              // instead of relying on AnimatePresence. Base UI waits for it before hiding.
              render={(props, state) => (
                <motion.div
                  {...(props as HTMLMotionProps<'div'>)}
                  initial={hidden}
                  animate={state.open ? shown : hidden}
                  transition={{ duration: 0.14, ease: 'easeOut' }}
                />
              )}
            >
              <SelectPrimitive.ScrollUpArrow className="custom-select-scroll">
                <ChevronUp size={16} aria-hidden="true" />
              </SelectPrimitive.ScrollUpArrow>
              <SelectPrimitive.List className="custom-select-viewport">
                {options.map((option) => (
                  <SelectPrimitive.Item
                    className="custom-select-item"
                    value={option.value}
                    key={option.value}
                  >
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator className="custom-select-check">
                      <Check size={15} aria-hidden="true" />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.List>
              <SelectPrimitive.ScrollDownArrow className="custom-select-scroll">
                <ChevronDown size={16} aria-hidden="true" />
              </SelectPrimitive.ScrollDownArrow>
            </SelectPrimitive.Popup>
          </MotionConfig>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

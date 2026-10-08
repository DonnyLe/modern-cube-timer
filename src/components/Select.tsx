import { useEffect, useRef } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

export function Select<Value extends string>({
  label,
  value,
  options,
  disabled,
  onValueChange,
  onOpenChange,
}: {
  label: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  disabled?: boolean;
  onValueChange: (value: Value) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (!disabled && restoreFocus.current) {
      trigger.current?.focus();
      restoreFocus.current = false;
    }
  }, [disabled]);
  return (
    <SelectPrimitive.Root
      value={value}
      disabled={disabled}
      onValueChange={(next) => onValueChange(next as Value)}
      onOpenChange={onOpenChange}
    >
      <SelectPrimitive.Trigger ref={trigger} className="custom-select-trigger" aria-label={label}>
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon className="custom-select-icon">
          <ChevronDown size={16} aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Content
        className="custom-select-content"
        position="popper"
        align="start"
        sideOffset={8}
        collisionPadding={16}
        onCloseAutoFocus={(event) => {
          // Changing puzzles briefly disables the trigger while its session loads.
          // Restore keyboard focus once it becomes available again.
          if (trigger.current?.disabled) {
            event.preventDefault();
            restoreFocus.current = true;
          }
        }}
      >
        <SelectPrimitive.ScrollUpButton className="custom-select-scroll">
          <ChevronUp size={16} aria-hidden="true" />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="custom-select-viewport">
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
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="custom-select-scroll">
          <ChevronDown size={16} aria-hidden="true" />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Root>
  );
}

import { useId, type ComponentProps, type ReactNode } from 'react';
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { Check } from 'lucide-react';

type CheckboxProps = Omit<
  ComponentProps<typeof CheckboxPrimitive.Root>,
  'children' | 'className'
> & {
  label: ReactNode;
  className?: string;
};

export function Checkbox({ label, className = '', ...props }: CheckboxProps) {
  const generatedId = useId();
  const id = props.id || generatedId;
  const labelId = `${id}-label`;

  return (
    <label
      className={`custom-checkbox-label ${className}`}
      htmlFor={id}
      data-disabled={props.disabled || undefined}
    >
      <CheckboxPrimitive.Root
        {...props}
        id={id}
        aria-labelledby={props['aria-labelledby'] || labelId}
        className="custom-checkbox"
      >
        <CheckboxPrimitive.Indicator className="custom-checkbox-indicator">
          <Check size={14} strokeWidth={2.5} aria-hidden="true" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <span id={labelId}>{label}</span>
    </label>
  );
}

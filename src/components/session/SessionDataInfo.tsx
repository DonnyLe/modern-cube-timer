import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

export function SessionDataInfo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="session-data-info">
      <summary aria-label={`About ${label}`}>
        <Info size={14} aria-hidden="true" />
      </summary>
      <p>{children}</p>
    </details>
  );
}

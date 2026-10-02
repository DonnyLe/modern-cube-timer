import type { Workspace } from '../core/types';
import { defaultWorkspace } from '../layout/defaults';
import { appearanceSchema, workspaceInputSchema } from './schemas';

export function validateWorkspace(raw: unknown): Workspace {
  const { appearance } = workspaceInputSchema.parse(raw);
  const result = defaultWorkspace();
  result.appearance = appearanceSchema.parse({
    ...result.appearance,
    ...appearance,
    light: { ...result.appearance.light, ...appearance.light },
    dark: { ...result.appearance.dark, ...appearance.dark },
  });
  // This release uses the approved fixed layout; imported geometry is not applied.
  return result;
}

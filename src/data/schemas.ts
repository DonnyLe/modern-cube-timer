import { z } from 'zod';
import { puzzleEvents } from '../core/puzzles';
import type { Appearance, Preferences, Session, Solve } from '../core/types';

const color = z.string().regex(/^#[0-9a-f]{6}$/i, 'Use a six-digit hex color.');
const timestamp = z.number().finite().min(0).max(8.64e15);
const duration = z.number().finite().min(0).lt(86_400_000);
const unit = z.number().min(0).max(1);

export const paletteSchema = z.object({
  text: color,
  accent: color,
  tint: color,
  outline: color,
  background: color,
  colorA: color,
  colorB: color,
});

export const appearanceSchema = z.object({
  theme: z.enum(['light', 'dark']),
  font: z.enum(['system', 'editorial', 'mono']),
  opacity: z.number().min(0.15).max(1),
  blur: z.number().min(0).max(40),
  radius: z.number().min(0).max(40),
  border: z.number().min(0).max(2),
  fontScale: z.number().min(0.85).max(1.3),
  glass: unit,
  shadow: unit,
  background: z.enum(['gradient', 'solid']),
  softness: unit,
  intensity: unit,
  distortion: unit,
  motion: z.boolean(),
  light: paletteSchema,
  dark: paletteSchema,
  timerSize: z.number().min(64).max(240),
  timerWeight: z.number().min(200).max(700),
  timerFont: z.enum(['system', 'mono']),
  precision: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  autoFit: z.boolean(),
  showStats: z.boolean(),
}) satisfies z.ZodType<Appearance>;

// Missing fields from earlier v1 settings inherit defaults; invalid provided fields fail.
export const workspaceInputSchema = z.object({
  version: z.literal(1),
  appearance: appearanceSchema.partial().extend({
    light: paletteSchema.partial().optional(),
    dark: paletteSchema.partial().optional(),
  }),
});

export const preferencesSchema = z.object({
  hideWidgetsInFocus: z.boolean().default(true),
  inspection: z.boolean().default(false),
  holdMs: z.number().min(0).max(1000).default(300),
  activeSessionId: z.string().min(1),
}) satisfies z.ZodType<Preferences>;

export const puzzleEventSchema = z.enum(puzzleEvents);
export const sessionSchema = z.object({
  puzzle: puzzleEventSchema.default('333'),
  id: z.string().min(1),
  name: z.string().trim().min(1),
  createdAt: timestamp.default(() => Date.now()),
}) satisfies z.ZodType<Session>;

export const solveSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  duration,
  penalty: z.enum(['none', '+2', 'DNF']),
  scramble: z.string(),
  timestamp,
  note: z.string().default(''),
}) satisfies z.ZodType<Solve>;

// Imports receive fresh IDs, so a legacy solve need not contain its original ID.
export const importedSolveSchema = solveSchema.omit({ id: true });
export const objectSchema = z.record(z.string(), z.unknown());
export const rowsSchema = z.array(z.unknown());
export const backupEnvelopeSchema = z.object({
  app: z.literal('turn'),
  version: z.union([z.literal(1), z.literal(2)]),
  sessions: rowsSchema,
  solves: rowsSchema,
  workspace: z.unknown().optional(),
});
export const csTimerMetadataSchema = z.object({
  name: z.string().min(1).optional(),
  opt: z.object({ scrType: z.string().optional() }).optional(),
});
export const csTimerRowSchema = z
  .tuple([
    z.tuple([z.union([z.literal(-1), z.literal(0), z.literal(2000)]), duration]),
    z.string(),
    z.string(),
    z.number().finite().min(0).max(8.64e12),
  ])
  .rest(z.unknown());

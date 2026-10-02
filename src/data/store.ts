import { create } from 'zustand';
import type { Preferences, Workspace } from '../core/types';
import { defaultWorkspace } from '../layout/defaults';
import { initialize, saveSetting } from './db';
interface Store {
  ready: boolean;
  error: string;
  workspace: Workspace;
  preferences: Preferences;
  past: Workspace[];
  future: Workspace[];
  editing: boolean;
  selected: string[];
  setError: (error: string) => void;
  boot: () => Promise<void>;
  setWorkspace: (w: Workspace, history?: boolean) => void;
  setPreferences: (p: Partial<Preferences>) => void;
  undo: () => void;
  redo: () => void;
}
let writes = Promise.resolve();
function persist(key: string, value: unknown) {
  writes = writes
    .then(() => saveSetting(key, value))
    .catch((e) =>
      useStore
        .getState()
        .setError(`Could not save locally: ${e.message}. Keep this tab open and export a backup.`),
    );
}
export const useStore = create<Store>((set, get) => ({
  ready: false,
  error: '',
  workspace: defaultWorkspace(),
  preferences: { inspection: false, holdMs: 300, activeSessionId: '' },
  past: [],
  future: [],
  editing: false,
  selected: [],
  setError: (error) => set({ error }),
  boot: async () => {
    try {
      const data = await initialize();
      set({ ...data, ready: true });
    } catch (e) {
      set({ error: `Could not open local storage: ${(e as Error).message}`, ready: true });
    }
  },
  setWorkspace: (workspace, history = true) => {
    set((s) => ({
      workspace,
      past: history ? [...s.past.slice(-39), structuredClone(s.workspace)] : s.past,
      future: history ? [] : s.future,
    }));
    persist('workspace', workspace);
  },
  setPreferences: (p) => {
    const preferences = { ...get().preferences, ...p };
    set({ preferences });
    persist('preferences', preferences);
  },
  undo: () => {
    const s = get(),
      w = s.past.at(-1);
    if (w) {
      set({ workspace: w, past: s.past.slice(0, -1), future: [s.workspace, ...s.future] });
      persist('workspace', w);
    }
  },
  redo: () => {
    const s = get(),
      w = s.future[0];
    if (w) {
      set({ workspace: w, past: [...s.past, s.workspace], future: s.future.slice(1) });
      persist('workspace', w);
    }
  },
}));
export async function safeWrite(action: () => Promise<unknown>) {
  try {
    await action();
    return true;
  } catch (e) {
    useStore
      .getState()
      .setError(`Could not save locally: ${(e as Error).message}. Export a backup before closing.`);
    return false;
  }
}

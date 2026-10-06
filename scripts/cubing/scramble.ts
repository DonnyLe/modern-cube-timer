import { setSearchDebug } from 'cubing/search';

// esbuild preserves the worker URL through cubing.js's supported fallback.
setSearchDebug({ prioritizeEsbuildWorkaroundForWorkerInstantiation: true });
export { randomScrambleForEvent } from 'cubing/scramble';

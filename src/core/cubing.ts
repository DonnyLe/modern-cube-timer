// These modules are built by esbuild and served unchanged by Vite.
export function loadScramble(): Promise<
  Pick<typeof import('cubing/scramble'), 'randomScrambleForEvent'>
> {
  const url = new URL(`${import.meta.env.BASE_URL}cubing/scramble.js`, window.location.href).href;
  return import(/* @vite-ignore */ url);
}

export function loadTwisty(): Promise<
  Pick<typeof import('cubing/twisty'), 'TwistyPlayer' | 'ExperimentalSVGAnimator'> &
    Pick<typeof import('cubing/puzzles'), 'puzzles'>
> {
  const url = new URL(`${import.meta.env.BASE_URL}cubing/twisty.js`, window.location.href).href;
  return import(/* @vite-ignore */ url);
}

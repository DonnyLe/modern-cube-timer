import { useStore } from '../data/store';
import type { Appearance, Palette } from '../core/types';
import { appearance } from '../layout/defaults';
export function Range({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  suffix = '',
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <label className="range-label">
      <span>
        {label}
        <output>
          {Number(value.toFixed(2))}
          {suffix}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
export function Settings({ dataControls }: { dataControls: React.ReactNode }) {
  const { workspace, setWorkspace, preferences, setPreferences } = useStore(),
    a = workspace.appearance,
    p = a[a.theme];
  const update = (patch: Partial<Appearance>) =>
    setWorkspace({ ...workspace, appearance: { ...a, ...patch } });
  const color = (key: keyof Palette, v: string) => update({ [a.theme]: { ...p, [key]: v } });
  return (
    <main className="settings-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MAKE ROOM FOR YOUR RHYTHM</p>
          <h1>Your workspace, your way.</h1>
          <p className="subtle">A little quieter. A little brighter. Exactly how you like it.</p>
        </div>
        <button onClick={() => update({ ...structuredClone(appearance), theme: a.theme })}>
          Reset appearance
        </button>
      </div>
      <div className="settings-layout">
        <div className="settings-sections">
          <section className="settings-card glass">
            <h2>Timing</h2>
            <label className="toggle-row">
              15-second inspection
              <input
                type="checkbox"
                checked={preferences.inspection}
                onChange={(e) => setPreferences({ inspection: e.target.checked })}
              />
            </label>
            <Range
              label="Hold to start"
              value={preferences.holdMs}
              min={0}
              max={1000}
              step={50}
              suffix=" ms"
              onChange={(holdMs) => setPreferences({ holdMs })}
            />
            <label>
              Display precision
              <select
                value={a.precision}
                onChange={(e) => update({ precision: Number(e.target.value) as 1 | 2 | 3 })}
              >
                <option value="1">Tenths · 12.8</option>
                <option value="2">Hundredths · 12.84</option>
                <option value="3">Milliseconds · 12.840</option>
              </select>
            </label>
          </section>
          <section className="settings-card glass">
            <h2>Focus mode</h2>
            <label className="toggle-row">
              Hide widgets in focus mode
              <input
                type="checkbox"
                checked={preferences.hideWidgetsInFocus}
                onChange={(e) => setPreferences({ hideWidgetsInFocus: e.target.checked })}
              />
            </label>
            <p className="subtle">
              Hover over the turn logo or press Esc to leave focus mode. On touchscreens, tap the
              logo.
            </p>
          </section>
          <section className="settings-card glass">
            <h2>Surfaces</h2>
            <Range
              label="Card opacity"
              value={a.opacity}
              min={0.15}
              onChange={(opacity) => update({ opacity })}
            />
            <Range
              label="Card blur"
              value={a.blur}
              max={40}
              step={1}
              suffix=" px"
              onChange={(blur) => update({ blur })}
            />
            <Range
              label="Glass highlight"
              value={a.glass}
              onChange={(glass) => update({ glass })}
            />
            <Range
              label="Corner radius"
              value={a.radius}
              max={40}
              step={1}
              suffix=" px"
              onChange={(radius) => update({ radius })}
            />
            <Range
              label="Outline weight"
              value={a.border}
              max={2}
              step={0.1}
              suffix=" px"
              onChange={(border) => update({ border })}
            />
            <Range label="Shadow" value={a.shadow} onChange={(shadow) => update({ shadow })} />
          </section>
          <section className="settings-card glass">
            <h2>Typography</h2>
            <label>
              Interface font
              <select
                value={a.font}
                onChange={(e) => update({ font: e.target.value as Appearance['font'] })}
              >
                <option value="system">System sans</option>
                <option value="editorial">Editorial serif</option>
                <option value="mono">Monospace</option>
              </select>
            </label>
            <Range
              label="Interface scale"
              value={a.fontScale}
              min={0.85}
              max={1.3}
              step={0.05}
              onChange={(fontScale) => update({ fontScale })}
            />
            <label>
              Timer font
              <select
                value={a.timerFont}
                onChange={(e) => update({ timerFont: e.target.value as 'system' | 'mono' })}
              >
                <option value="system">System sans</option>
                <option value="mono">Monospace</option>
              </select>
            </label>
            <Range
              label="Timer size"
              value={a.timerSize}
              min={64}
              max={240}
              step={4}
              suffix=" px"
              onChange={(timerSize) => update({ timerSize })}
            />
            <Range
              label="Timer weight"
              value={a.timerWeight}
              min={200}
              max={700}
              step={50}
              onChange={(timerWeight) => update({ timerWeight })}
            />
            <label className="toggle-row">
              Auto-fit timer
              <input
                type="checkbox"
                checked={a.autoFit}
                onChange={(e) => update({ autoFit: e.target.checked })}
              />
            </label>
            <label className="toggle-row">
              Show averages
              <input
                type="checkbox"
                checked={a.showStats}
                onChange={(e) => update({ showStats: e.target.checked })}
              />
            </label>
          </section>
          <section className="settings-card glass">
            <h2>Color & background</h2>
            <label>
              Theme
              <select
                value={a.theme}
                onChange={(e) => update({ theme: e.target.value as 'light' | 'dark' })}
              >
                <option>light</option>
                <option>dark</option>
              </select>
            </label>
            <div className="color-grid">
              {(
                ['text', 'accent', 'tint', 'outline', 'background', 'colorA', 'colorB'] as const
              ).map((key) => (
                <label key={key}>
                  {({ colorA: 'Blue field', colorB: 'Peach field' } as Record<string, string>)[
                    key
                  ] || key}
                  <input type="color" value={p[key]} onChange={(e) => color(key, e.target.value)} />
                </label>
              ))}
            </div>
            <label>
              Background style
              <select
                value={a.background}
                onChange={(e) => update({ background: e.target.value as 'gradient' | 'solid' })}
              >
                <option value="gradient">Flowing gradient</option>
                <option value="solid">Solid color</option>
              </select>
            </label>
            <Range
              label="Background softness"
              value={a.softness}
              onChange={(softness) => update({ softness })}
            />
            <label className="toggle-row">
              Background motion
              <input
                type="checkbox"
                checked={a.motion}
                onChange={(e) => update({ motion: e.target.checked })}
              />
            </label>
            <Range
              label="Motion intensity"
              value={a.intensity}
              onChange={(intensity) => update({ intensity })}
            />
            <Range
              label="Cursor displacement"
              value={a.distortion}
              onChange={(distortion) => update({ distortion })}
            />
            <p className="subtle">
              Motion pauses while solving and follows your reduced-motion preference.
            </p>
          </section>
          <section className="settings-card glass">
            <h2>Your data</h2>
            {dataControls}
          </section>
        </div>
        <aside className="appearance-preview">
          <div
            className="preview-timer"
            style={{
              fontSize: 80,
              fontWeight: a.timerWeight,
              fontFamily: a.timerFont === 'mono' ? 'monospace' : 'inherit',
            }}
          >
            12.84
          </div>
          <p className="subtle">A space to focus.</p>
          <div className="preview-card glass">
            <h2>Recent solves</h2>
            <div className="solve-row">
              <span>3</span>
              <strong>12.84</strong>
            </div>
            <div className="solve-row">
              <span>2</span>
              <strong>13.07</strong>
            </div>
            <div className="solve-row">
              <span>1</span>
              <strong>14.11</strong>
            </div>
          </div>
          <small>Appearance preview · sample times</small>
        </aside>
      </div>
    </main>
  );
}

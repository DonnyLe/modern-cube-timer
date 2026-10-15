import { Select } from './ui/Select';
import { useStore } from '../data/store';
import type { Appearance, Palette, Theme } from '../core/types';
import { appearance } from '../layout/defaults';
import { backgroundCss, backgroundStyles, isPattern } from '../core/backgrounds';

export function Range({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  suffix = '',
  disabled = false,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
  disabled?: boolean;
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
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function Settings({ dataControls, theme }: { dataControls: React.ReactNode; theme: Theme }) {
  const { workspace, setWorkspace, preferences, setPreferences } = useStore(),
    a = workspace.appearance,
    p = a[theme];
  const update = (patch: Partial<Appearance>) =>
    setWorkspace({ ...workspace, appearance: { ...a, ...patch } });
  const pattern = isPattern(a.background);
  const color = (key: keyof Palette, v: string) => update({ [theme]: { ...p, [key]: v } });

  return (
    <main className="settings-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MAKE ROOM FOR YOUR RHYTHM</p>
          <h1>Your workspace, your way.</h1>
          <p className="subtle">A little quieter. A little brighter. Exactly how you like it.</p>
        </div>
        <button onClick={() => update(structuredClone(appearance))}>Reset appearance</button>
      </div>
      <div className="settings-layout">
        <div className="settings-sections">
          <section className="settings-card glass">
            <h2>Timing</h2>
            <label className="toggle-row">
              Hide clock while solving
              <input
                type="checkbox"
                checked={preferences.hideClockWhileSolving}
                onChange={(e) => setPreferences({ hideClockWhileSolving: e.target.checked })}
                aria-describedby="hide-clock-description"
              />
            </label>
            <p className="subtle" id="hide-clock-description">
              Show “Solving...” until you stop. Inspection and your final time stay visible.
            </p>
            <label className="toggle-row">
              Hide UI while solving
              <input
                type="checkbox"
                checked={preferences.hideUIWhileSolving}
                onChange={(e) => setPreferences({ hideUIWhileSolving: e.target.checked })}
                aria-describedby="hide-ui-description"
              />
            </label>
            <p className="subtle" id="hide-ui-description">
              Blur and fade everything except the timer as you hold to start. Bring it back when you
              stop or cancel.
            </p>
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
            <h2>Sessions</h2>
            <label className="toggle-row">
              Start sessions automatically after a break
              <input
                type="checkbox"
                checked={preferences.automaticSessions}
                onChange={(e) => setPreferences({ automaticSessions: e.target.checked })}
              />
            </label>
            <label>
              Break before a new session (hours)
              <input
                type="number"
                min="1"
                max="24"
                step="1"
                value={preferences.sessionBreakHours}
                disabled={!preferences.automaticSessions}
                onChange={(e) => {
                  const hours = Number(e.target.value);

                  if (hours >= 1 && hours <= 24) setPreferences({ sessionBreakHours: hours });
                }}
              />
            </label>
            <p className="subtle">
              Your first solve after a break starts a new session for the same puzzle. Previous
              sessions and solves stay in your history.
            </p>
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
              label="Card radius"
              value={a.radius}
              max={40}
              step={1}
              suffix=" px"
              onChange={(radius) => update({ radius })}
            />
            <Range
              label="Control radius"
              value={a.controlRadius}
              max={40}
              step={1}
              suffix=" px"
              onChange={(controlRadius) => update({ controlRadius })}
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
            <div className="color-mode">
              <p>Color mode</p>
              <Select<Appearance['theme']>
                label="Color mode"
                value={a.theme}
                options={[
                  { value: 'light', label: 'Day' },
                  { value: 'dark', label: 'Night' },
                  { value: 'auto', label: 'Automatic day/night' },
                  { value: 'system', label: 'Use system settings' },
                ]}
                onValueChange={(theme) => update({ theme })}
              />
              {a.theme === 'auto' && (
                <p className="subtle">
                  Day from 7 a.m. to 7 p.m., night after. Uses your local time.
                </p>
              )}
              {a.theme === 'system' && (
                <p className="subtle">Follows your device’s light or dark appearance.</p>
              )}
            </div>
            <p className="subtle">Editing {theme === 'light' ? 'day' : 'night'} colors.</p>
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
            <fieldset className="background-picker">
              <legend>Background style</legend>
              {backgroundStyles.map(({ value, label }) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="background"
                    value={value}
                    checked={a.background === value}
                    onChange={() => update({ background: value })}
                  />
                  <span
                    className="background-swatch"
                    aria-hidden="true"
                    style={{
                      background: backgroundCss(
                        value,
                        p,
                        Math.round(a.patternSpacing * 0.6),
                        Math.max(a.patternContrast, 0.3),
                      ),
                    }}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            {a.background === 'gradient' && (
              <Range
                label="Background softness"
                value={a.softness}
                onChange={(softness) => update({ softness })}
              />
            )}
            {pattern && (
              <>
                <Range
                  label="Pattern spacing"
                  value={a.patternSpacing}
                  min={16}
                  max={64}
                  step={2}
                  suffix=" px"
                  onChange={(patternSpacing) => update({ patternSpacing })}
                />
                <Range
                  label="Pattern contrast"
                  value={a.patternContrast}
                  onChange={(patternContrast) => update({ patternContrast })}
                />
              </>
            )}
            {a.background !== 'solid' && (
              <>
                <label className="toggle-row">
                  Continuous background motion
                  <input
                    type="checkbox"
                    checked={a.motion}
                    onChange={(e) => update({ motion: e.target.checked })}
                    aria-describedby="motion-description"
                  />
                </label>
                <Range
                  label={pattern ? 'Drift speed' : 'Motion speed'}
                  value={pattern ? a.intensity : Math.max(0.05, a.intensity)}
                  min={pattern ? 0 : 0.05}
                  disabled={!a.motion}
                  onChange={(intensity) => update({ intensity })}
                />
                <Range
                  label={pattern ? 'Pointer response' : 'Cursor displacement'}
                  value={a.distortion}
                  disabled={!a.motion}
                  onChange={(distortion) => update({ distortion })}
                />
                <p className="subtle" id="motion-description">
                  {pattern
                    ? 'Keep the pattern drifting while idle. Turn motion off for a static pattern, or set drift to 0 for pointer response only.'
                    : 'Keep the gradient moving while idle, even without moving your cursor. Turn motion off for a static gradient.'}{' '}
                  Motion pauses during inspection and solving, respects reduced motion, and stops
                  while this tab is hidden.
                </p>
              </>
            )}
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

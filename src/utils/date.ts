export function formatSessionDate(timestamp: number) {
  const then = new Date(timestamp);
  const time = then.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return then.toDateString() === new Date().toDateString()
    ? `Today, ${time}`
    : then.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function formatElapsedTime(timestamp: number) {
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  return minutes < 60
    ? formatter.format(-minutes, 'minute')
    : formatter.format(-Math.round(minutes / 60), 'hour');
}

export function formatSessionDuration(ms: number) {
  if (ms <= 0) return '0s';
  if (ms < 1000) return '<1s';
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)} min`;

  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);

  return minutes ? `${hours}h ${minutes} min` : `${hours}h`;
}

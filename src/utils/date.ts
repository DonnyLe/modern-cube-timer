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

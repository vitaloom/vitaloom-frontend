const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export function sleepDuration(minutes: number) {
  const whole = Math.round(minutes);
  const hours = Math.floor(whole / 60);
  const remainder = whole % 60;
  if (hours === 0) return `${remainder}m`;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function sleepDay(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? day : dateFormatter.format(date);
}

export function sleepPeriod(start: string, end: string) {
  return `${sleepDay(start)} – ${sleepDay(end)}`;
}

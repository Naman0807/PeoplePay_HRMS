export function computeWorkedHours(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  const hours = ms / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

export function classifyAttendance(checkIn: Date | null, checkOut: Date | null): 'NORMAL' | 'EXCEPTION' {
  if (checkIn && checkOut) return 'NORMAL';
  return 'EXCEPTION';
}

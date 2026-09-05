/** Anything with a start, an end and a break — a schedule line, saved or not yet. */
export interface WeeklyHoursLine {
  start_time: Date | string;
  end_time: Date | string;
  break_duration_mins: number;
}

function toMinutes(time: Date | string): number {
  if (typeof time === 'string') {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
  return time.getHours() * 60 + time.getMinutes();
}

/** Sums the paid time of every line, treating `end <= start` as an overnight shift. */
export function calculateWeeklyHours(lines: WeeklyHoursLine[]): number {
  let totalMinutes = 0;
  for (const line of lines) {
    const start = toMinutes(line.start_time);
    let end = toMinutes(line.end_time);
    if (end <= start) end += 24 * 60; // overnight shift
    const workMinutes = end - start - line.break_duration_mins;
    totalMinutes += Math.max(0, workMinutes);
  }
  return Math.round((totalMinutes / 60) * 100) / 100;
}

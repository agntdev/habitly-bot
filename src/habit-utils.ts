import { localDate, now } from "./clock.js";
import type { Checkin, Habit, Metrics, ScheduleType } from "./habits.js";

export function isTimezone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isDue(habit: Habit, timezone: string, date = localDate(timezone)): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(now());
  if (habit.schedule_type === "daily") return true;
  if (habit.schedule_type === "weekdays") return weekday !== "Sat" && weekday !== "Sun";
  return weekday === "Mon";
}

export function checkinKey(habitId: string, date: string): string {
  return `${habitId}:${date}`;
}

export function computeMetrics(habit: Habit, checkins: Record<string, Checkin>, timezone: string): Metrics {
  const relevant = Object.entries(checkins)
    .filter(([key]) => key.startsWith(`${habit.id}:`))
    .sort(([a], [b]) => a.localeCompare(b));
  const done = relevant.filter(([, checkin]) => checkin.status === "done").length;
  let current = 0;
  let longest = 0;
  for (const [, checkin] of relevant) {
    if (checkin.status === "done") {
      current += 1;
      longest = Math.max(longest, current);
    } else current = 0;
  }
  const todayKey = checkinKey(habit.id, localDate(timezone));
  if (!checkins[todayKey] || checkins[todayKey].status !== "done") current = 0;
  return {
    current_streak: current,
    longest_streak: longest,
    completion_rate: relevant.length === 0 ? 0 : Math.round((done / relevant.length) * 100),
  };
}

export function scheduleLabel(schedule: ScheduleType): string {
  return schedule === "daily" ? "Every day" : schedule === "weekdays" ? "Weekdays" : "Every Monday";
}

export function nextReminder(habit: Habit, timezone: string): string {
  const today = localDate(timezone);
  return `${today} at ${habit.reminder_time} (${timezone})`;
}

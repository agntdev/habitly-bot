import type { Ctx } from "./bot.js";
import { now, timeInZone } from "./clock.js";
import type { Habit } from "./habits.js";
import { inlineButton, inlineKeyboard } from "./toolkit/index.js";
import { remindAt, type WorkerEnv } from "./toolkit/session/durable.js";

type WorkerHabitCtx = Ctx & { env?: WorkerEnv };

/** Arms the next Worker alarm when this bot is running on Cloudflare. */
export async function scheduleHabitReminder(ctx: Ctx, habit: Habit): Promise<void> {
  const workerCtx = ctx as WorkerHabitCtx;
  const userId = ctx.from?.id;
  const record = userId ? await ctx.habitStore.get(userId) : undefined;
  if (!workerCtx.env || !userId || !record || habit.paused) return;
  const [targetHour, targetMinute] = habit.reminder_time.split(":").map(Number);
  const [currentHour, currentMinute] = timeInZone(record.user.timezone).split(":").map(Number);
  let minutes = (targetHour * 60 + targetMinute) - (currentHour * 60 + currentMinute);
  if (minutes <= 0) minutes += 24 * 60;
  if (habit.schedule_type === "weekly") minutes += 6 * 24 * 60;
  if (habit.schedule_type === "weekdays" && [0, 6].includes(now().getUTCDay())) minutes += 24 * 60;
  await remindAt(
    workerCtx.env,
    userId,
    now().getTime() + minutes * 60_000,
    `A small moment for ${habit.title}. How did it go?`,
    inlineKeyboard([[inlineButton("Done", `checkin:done:${habit.id}`), inlineButton("Skip", `checkin:skip:${habit.id}`)]]),
  );
}

import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { localDate, now } from "../clock.js";
import { checkinKey, computeMetrics, isDue } from "../habit-utils.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { scheduleHabitReminder } from "../reminders.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.
// Menu: wire this into /start via registerMainMenuItem({ label: "Done", data: "checkin:done" }) if the toolkit exposes it.

const composer = new Composer<Ctx>();

composer.callbackQuery("checkin:done", async (ctx) => {
  await ctx.answerCallbackQuery();
  await recordCheckin(ctx, "done");
});

composer.on("callback_query:data", async (ctx, next) => {
  if (!ctx.callbackQuery.data.startsWith("checkin:done:")) return next();
  await ctx.answerCallbackQuery();
  await recordCheckin(ctx, "done", ctx.callbackQuery.data.slice("checkin:done:".length));
});

async function recordCheckin(ctx: Ctx, status: "done", requestedId?: string): Promise<void> {
  const userId = ctx.from?.id;
  const record = userId ? await ctx.habitStore.get(userId) : undefined;
  const habit = record?.habits.find((item) => item.id === requestedId) ?? record?.habits.find((item) => !item.paused && isDue(item, record.user.timezone));
  if (!record || !habit || !userId) {
    await ctx.reply("There’s no active reminder to check in for right now.");
    return;
  }
  const date = localDate(record.user.timezone);
  const key = checkinKey(habit.id, date);
  if (record.checkins[key]) {
    await ctx.reply(`You already checked in for ${habit.title} today. Nice follow-through.`);
    return;
  }
  record.checkins[key] = { date, status, timestamp: now().toISOString() };
  const metrics = computeMetrics(habit, record.checkins, record.user.timezone);
  record.metrics[habit.id] = metrics;
  await ctx.habitStore.save(userId, record);
  await scheduleHabitReminder(ctx, habit);
  const milestone = record.milestones.includes(metrics.current_streak);
  await ctx.reply(milestone ? `${habit.title}: ${metrics.current_streak}-day streak! Keep making it easy to show up tomorrow.` : `${habit.title} is checked off. Your streak is ${metrics.current_streak} day${metrics.current_streak === 1 ? "" : "s"}.`, {
    reply_markup: inlineKeyboard([[inlineButton("View my habits", "habits:show")]]),
  });
}

export default composer;

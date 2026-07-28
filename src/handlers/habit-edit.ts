import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.
// Menu: wire this into /start via registerMainMenuItem({ label: "Edit Habit", data: "habit:edit" }) if the toolkit exposes it.

const composer = new Composer<Ctx>();

composer.callbackQuery("habit:edit", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  const record = userId ? await ctx.habitStore.get(userId) : undefined;
  const habit = record?.habits.find((item) => !item.paused) ?? record?.habits[0];
  if (!habit) {
    await ctx.reply("There isn’t a habit to edit yet — tap Add a habit first.");
    return;
  }
  await editHabit(ctx, habit.id);
});

composer.on("callback_query:data", async (ctx, next) => {
  if (!ctx.callbackQuery.data.startsWith("habit:edit:")) return next();
  await ctx.answerCallbackQuery();
  await editHabit(ctx, ctx.callbackQuery.data.slice("habit:edit:".length));
});

composer.on("callback_query:data", async (ctx, next) => {
  if (!ctx.callbackQuery.data.startsWith("habit:pause:")) return next();
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  const record = userId ? await ctx.habitStore.get(userId) : undefined;
  const habit = record?.habits.find((item) => item.id === ctx.callbackQuery.data.slice("habit:pause:".length));
  if (!record || !habit || !userId) return;
  habit.paused = !habit.paused;
  await ctx.habitStore.save(userId, record);
  await ctx.editMessageText(habit.paused ? `${habit.title} is paused. Come back whenever you’re ready.` : `${habit.title} is active again. I’m cheering for you.`);
});

composer.on("callback_query:data", async (ctx, next) => {
  if (!ctx.callbackQuery.data.startsWith("habit:time:")) return next();
  await ctx.answerCallbackQuery();
  ctx.session.step = "edit-time";
  ctx.session.editHabitId = ctx.callbackQuery.data.slice("habit:time:".length);
  await ctx.editMessageText("Send the new reminder time in 24-hour format, like 18:30.");
});

async function editHabit(ctx: Ctx, habitId: string): Promise<void> {
  const userId = ctx.from?.id;
  const record = userId ? await ctx.habitStore.get(userId) : undefined;
  const habit = record?.habits.find((item) => item.id === habitId);
  if (!habit) {
    await ctx.reply("I couldn’t find that habit. Open My habits and try again.");
    return;
  }
  await ctx.editMessageText(`Make ${habit.title} fit your life.`, {
    reply_markup: inlineKeyboard([
      [inlineButton("Change reminder time", `habit:time:${habit.id}`)],
      [inlineButton("Change schedule", `habit:schedule:${habit.id}`)],
      [inlineButton(habit.paused ? "Resume habit" : "Pause habit", `habit:pause:${habit.id}`)],
      [inlineButton("Back to habits", "habits:show")],
    ]),
  });
}

composer.on("callback_query:data", async (ctx, next) => {
  if (!ctx.callbackQuery.data.startsWith("habit:schedule:")) return next();
  await ctx.answerCallbackQuery();
  const habitId = ctx.callbackQuery.data.slice("habit:schedule:".length);
  await ctx.editMessageText("Choose the rhythm that fits best.", {
    reply_markup: inlineKeyboard([
      [inlineButton("Every day", `habit:set-schedule:${habitId}:daily`)],
      [inlineButton("Weekdays", `habit:set-schedule:${habitId}:weekdays`)],
      [inlineButton("Every Monday", `habit:set-schedule:${habitId}:weekly`)],
    ]),
  });
});

composer.on("callback_query:data", async (ctx, next) => {
  if (!ctx.callbackQuery.data.startsWith("habit:set-schedule:")) return next();
  await ctx.answerCallbackQuery();
  const [, , habitId, schedule] = ctx.callbackQuery.data.split(":");
  const userId = ctx.from?.id;
  const record = userId ? await ctx.habitStore.get(userId) : undefined;
  const habit = record?.habits.find((item) => item.id === habitId);
  if (!record || !habit || !userId || !["daily", "weekdays", "weekly"].includes(schedule)) return;
  habit.schedule_type = schedule as typeof habit.schedule_type;
  await ctx.habitStore.save(userId, record);
  await ctx.editMessageText(`Your ${habit.title} schedule is updated. Small, steady steps count.`);
});

export default composer;

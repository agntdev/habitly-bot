import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { nextReminder, scheduleLabel } from "../habit-utils.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.

registerMainMenuItem({ label: "📋 My habits", data: "habits:show", order: 20 });
const composer = new Composer<Ctx>();

composer.callbackQuery("habits:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  const record = userId ? await ctx.habitStore.get(userId) : undefined;
  if (!record || record.habits.length === 0) {
    await ctx.editMessageText("No habits yet — tap Add a habit to begin.", {
      reply_markup: inlineKeyboard([[inlineButton("Add a habit", "habit:new")], [inlineButton("Back to menu", "menu:main")]]),
    });
    return;
  }
  const lines = record.habits.map((habit) => {
    const metrics = record.metrics[habit.id] ?? { current_streak: 0, longest_streak: 0, completion_rate: 0 };
    const state = habit.paused ? "Paused" : `${scheduleLabel(habit.schedule_type)} · next ${nextReminder(habit, record.user.timezone)}`;
    return `${habit.title}\n${state}\nStreak ${metrics.current_streak} · best ${metrics.longest_streak}`;
  });
  await ctx.editMessageText(lines.join("\n\n"), {
    reply_markup: inlineKeyboard([
      ...record.habits.slice(0, 4).map((habit) => [inlineButton(`Edit ${habit.title.slice(0, 16)}`, `habit:edit:${habit.id}`)]),
      [inlineButton("Back to menu", "menu:main")],
    ]),
  });
});

export default composer;

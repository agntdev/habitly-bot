import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "📈 Weekly recap", data: "recap:show", order: 30 });

const composer = new Composer<Ctx>();

composer.callbackQuery("recap:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  const record = userId ? await ctx.habitStore.get(userId) : undefined;
  if (!record || record.habits.length === 0) {
    await ctx.editMessageText("Your first weekly recap starts once you’ve added a habit.", {
      reply_markup: inlineKeyboard([[inlineButton("Add a habit", "habit:new")], [inlineButton("Back to menu", "menu:main")]]),
    });
    return;
  }
  const totals = Object.values(record.metrics);
  const rate = totals.length === 0 ? 0 : Math.round(totals.reduce((sum, item) => sum + item.completion_rate, 0) / totals.length);
  const done = Object.values(record.checkins).filter((item) => item.status === "done").length;
  const skipped = Object.values(record.checkins).filter((item) => item.status === "skipped").length;
  const timeline = `${"✅".repeat(Math.min(done, 7))}${"➖".repeat(Math.min(skipped, Math.max(0, 7 - done))) || "No check-ins yet"}`;
  const tip = rate < 70 ? "Try linking one habit to something you already do each day." : "You’re building a steady rhythm — keep the next step small.";
  await ctx.editMessageText(`This week: ${rate}% complete\n${timeline}\n\n${tip}`, {
    reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
  });
});

export default composer;

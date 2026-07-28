import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { isTime, isTimezone, scheduleLabel } from "../habit-utils.js";
import { localDate } from "../clock.js";
import { scheduleHabitReminder } from "../reminders.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.

registerMainMenuItem({ label: "➕ Add a habit", data: "habit:new", order: 10 });
const composer = new Composer<Ctx>();

composer.callbackQuery("habit:new", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "title";
  await ctx.editMessageText("What habit would you like to build? Send a short name.");
});

composer.callbackQuery(["habit:schedule:daily", "habit:schedule:weekdays", "habit:schedule:weekly"], async (ctx) => {
  await ctx.answerCallbackQuery();
  const schedule = ctx.callbackQuery.data.replace("habit:schedule:", "") as "daily" | "weekdays" | "weekly";
  const userId = ctx.from?.id;
  if (!userId || !ctx.session.draftTitle) return;
  ctx.session.step = "time";
  ctx.session.draftTitle = `${ctx.session.draftTitle}|${schedule}`;
  await ctx.editMessageText(`${scheduleLabel(schedule)} is a lovely rhythm.\n\nSend a reminder time in 24-hour format, like 08:30.`);
});

composer.on("message:text", async (ctx, next) => {
  const text = ctx.message.text.trim();
  const userId = ctx.from?.id;
  if (!userId) return next();
  if (ctx.session.step === "timezone") {
    if (!isTimezone(text)) {
      await ctx.reply("I couldn’t recognize that time zone. Try one like Europe/London.");
      return;
    }
    const record = await ctx.habitStore.ensureUser(userId, text);
    record.user.timezone = text;
    await ctx.habitStore.save(userId, record);
    ctx.session.step = undefined;
    await ctx.reply("Time zone saved. You’re ready to add a habit.", { reply_markup: inlineKeyboard([[inlineButton("Add a habit", "habit:new")]]) });
    return;
  }
  if (ctx.session.step === "title") {
    if (text.length < 1 || text.length > 80) {
      await ctx.reply("Keep the habit name between 1 and 80 characters, then try again.");
      return;
    }
    ctx.session.draftTitle = text;
    ctx.session.step = undefined;
    await ctx.reply("Choose a rhythm that feels realistic.", {
      reply_markup: inlineKeyboard([
        [inlineButton("Every day", "habit:schedule:daily")],
        [inlineButton("Weekdays", "habit:schedule:weekdays")],
        [inlineButton("Every Monday", "habit:schedule:weekly")],
      ]),
    });
    return;
  }
  if (ctx.session.step === "time") {
    if (!isTime(text) || !ctx.session.draftTitle) {
      await ctx.reply("Use a 24-hour time like 08:30.");
      return;
    }
    const [title, schedule] = ctx.session.draftTitle.split("|");
    const record = await ctx.habitStore.ensureUser(userId, "UTC");
    const habit = { id: `${record.habits.length + 1}`, title, schedule_type: schedule as "daily" | "weekdays" | "weekly", reminder_time: text, paused: false, start_date: localDate(record.user.timezone) };
    record.habits.push(habit);
    await ctx.habitStore.save(userId, record);
    await scheduleHabitReminder(ctx, habit);
    ctx.session.step = undefined;
    ctx.session.draftTitle = undefined;
    await ctx.reply(`${title} is ready. I’ll remind you at ${text} in ${record.user.timezone}.`, {
      reply_markup: inlineKeyboard([[inlineButton("View my habits", "habits:show")]]),
    });
    return;
  }
  if (ctx.session.step === "edit-time") {
    if (!isTime(text) || !ctx.session.editHabitId) {
      await ctx.reply("Use a 24-hour time like 08:30.");
      return;
    }
    const record = await ctx.habitStore.get(userId);
    const habit = record?.habits.find((item) => item.id === ctx.session.editHabitId);
    if (!record || !habit) return;
    habit.reminder_time = text;
    await ctx.habitStore.save(userId, record);
    ctx.session.step = undefined;
    ctx.session.editHabitId = undefined;
    await ctx.reply(`Your reminder now arrives at ${text}. You’ve got this.`);
    return;
  }
  return next();
});

export default composer;

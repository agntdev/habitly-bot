import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, mainMenuKeyboard } from "../toolkit/index.js";

// The /start handler renders the bot's MAIN MENU — the primary way users operate
// a button-first bot. A feature adds its own button by calling
// `registerMainMenuItem(...)` in its own `src/handlers/<slug>.ts`; this handler
// renders whatever is registered (plus a Help button), so you do NOT edit this
// file to add a feature. Send ONE message — no placeholder line above the menu.
const composer = new Composer<Ctx>();

const WELCOME = "Welcome to your private habit space.\n\nTap a habit to keep your promise to yourself.";

composer.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const existing = await ctx.habitStore.get(userId);
  if (!existing) {
    await ctx.habitStore.ensureUser(userId, "UTC");
    await ctx.reply("Welcome — I’ll keep every habit private to you.\n\nYour time zone is UTC. Is that right?", {
      reply_markup: inlineKeyboard([
        [inlineButton("Use UTC", "timezone:keep"), inlineButton("Change time zone", "timezone:change")],
      ]),
    });
    return;
  }
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("timezone:keep", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText("You’re all set. Add your first habit whenever you’re ready.", {
    reply_markup: mainMenuKeyboard(),
  });
});

composer.callbackQuery("timezone:change", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "timezone";
  await ctx.editMessageText("Send your time zone, like Europe/London or America/New_York.");
});

// "Back to menu" — re-render the main menu in place from any sub-view.
composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;

import { Composer, type Bot } from "grammy";
import { createBot, type BotContext, type CreateBotOptions } from "./toolkit/index.js";
import type { StorageAdapter } from "grammy";
import { createHabitStore, type HabitRecord, type HabitStore } from "./habits.js";
import checkinDone from "./handlers/checkin-done.js";
import checkinSkip from "./handlers/checkin-skip.js";
import habitEdit from "./handlers/habit-edit.js";
import habits from "./handlers/habits.js";
import help from "./handlers/help.js";
import newHabit from "./handlers/new.js";
import start from "./handlers/start.js";
import weeklyRecap from "./handlers/weekly-recap.js";

// The per-chat session shape (ephemeral conversation state only). Extend as the
// bot grows. Durable domain data must NOT live here — use the toolkit's
// persistent storage (see AGENTS.md).
export interface Session {
  step?: "timezone" | "title" | "time" | "edit-time";
  draftTitle?: string;
  editHabitId?: string;
}

export type Ctx = BotContext<Session> & { habitStore: HabitStore };

/**
 * BuildBotOptions lets a runtime-specific ENTRY POINT (never a feature handler)
 * override how the bot is assembled:
 *
 *  - `handlers`: a pre-loaded list of feature Composers. The Cloudflare Workers
 *    entry (src/worker.ts) passes these from a BUILD-TIME manifest, because the
 *    Workers runtime has no filesystem — `readdirSync` + dynamic `import()` only
 *    work under Node (dev, the test harness, and the Fly/long-poll entry). When
 *    omitted, buildBot falls back to the Node disk scan, so nothing on the Node
 *    path changes.
 *  - `storage`: an explicit grammY session StorageAdapter (Workers passes a
 *    Durable-Object-backed one; Node auto-selects Redis/in-memory).
 */
export interface BuildBotOptions {
  handlers?: Composer<Ctx>[];
  storage?: StorageAdapter<Session>;
  telemetryEnv?: CreateBotOptions<Session>["telemetryEnv"];
  telemetryReporterOptions?: CreateBotOptions<Session>["telemetryReporterOptions"];
}

/**
 * buildBot — assembles the bot, AUTO-LOADS every feature handler from
 * src/handlers/, then registers the global fallback. Does NOT start the bot.
 * Add a feature by creating src/handlers/<name>.ts that default-exports a grammY
 * Composer — NEVER edit this file (concurrent feature PRs would conflict).
 *
 * Runtime-agnostic: the Node entry (src/index.ts) and the test harness call
 * `buildBot(token)` and get the disk-scanned handlers; the Workers entry
 * (src/worker.ts) calls `buildBot(token, { handlers, storage })` with a
 * build-time manifest because Workers has no filesystem.
 */
export function buildBot(token: string, opts: BuildBotOptions = {}) {
  const bot = createBot<Session>(token, {
    initial: () => ({}),
    storage: opts.storage,
    telemetryEnv: opts.telemetryEnv,
    telemetryReporterOptions: opts.telemetryReporterOptions,
  }) as unknown as Bot<Ctx>;

  const habitStore = createHabitStore(opts.storage as StorageAdapter<HabitRecord> | undefined);
  bot.use((ctx, next) => {
    (ctx as Ctx).habitStore = habitStore;
    return next();
  });

  const handlers = opts.handlers ?? [checkinDone, checkinSkip, habitEdit, habits, help, newHabit, start, weeklyRecap];
  for (const h of handlers) bot.use(h);

  bot.on("message", (ctx) => ctx.reply("Sorry, I didn't understand that. Try /help."));

  return bot;
}

import type { StorageAdapter } from "grammy";
import { resolveSessionStorage } from "./toolkit/session/redis.js";

export type ScheduleType = "daily" | "weekdays" | "weekly";
export type CheckinStatus = "done" | "skipped";

export interface UserProfile {
  telegram_id: number;
  timezone: string;
  preferences: Record<string, boolean>;
}

export interface Habit {
  id: string;
  title: string;
  schedule_type: ScheduleType;
  reminder_time: string;
  paused: boolean;
  start_date: string;
}

export interface Checkin {
  date: string;
  status: CheckinStatus;
  timestamp: string;
}

export interface Metrics {
  current_streak: number;
  longest_streak: number;
  completion_rate: number;
}

export interface HabitRecord {
  user: UserProfile;
  habits: Habit[];
  checkins: Record<string, Checkin>;
  metrics: Record<string, Metrics>;
  milestones: number[];
}

export class HabitStore {
  constructor(private readonly storage: StorageAdapter<HabitRecord>) {}

  private key(userId: number): string {
    return `habits:user:${userId}`;
  }

  async get(userId: number): Promise<HabitRecord | undefined> {
    return this.storage.read(this.key(userId));
  }

  async ensureUser(userId: number, timezone: string): Promise<HabitRecord> {
    const existing = await this.get(userId);
    if (existing) return existing;
    const record: HabitRecord = {
      user: { telegram_id: userId, timezone, preferences: {} },
      habits: [], checkins: {}, metrics: {}, milestones: [7, 21, 30],
    };
    await this.save(userId, record);
    return record;
  }

  async save(userId: number, record: HabitRecord): Promise<void> {
    await this.storage.write(this.key(userId), record);
  }
}

/** Domain records use a direct, indexed persistent key per Telegram user. */
export function createHabitStore(storage?: StorageAdapter<HabitRecord>): HabitStore {
  return new HabitStore(resolveSessionStorage<HabitRecord>(storage));
}

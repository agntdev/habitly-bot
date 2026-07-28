# Private Habit Tracker — Bot specification

**Archetype:** custom

**Voice:** encouraging and warm — write every user-facing message, button label, error, and empty state in this voice.

A Telegram bot that helps users track personal habits with flexible schedules, one-tap check-ins, and private progress metrics. Features include daily/weekday/weekly schedules, retroactive edits, streak tracking, weekly recaps, and milestone celebrations—all with a warm, encouraging tone and strict privacy.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- individual users seeking lightweight habit tracking

## Success criteria

- Users receive scheduled reminders and complete check-ins with one tap
- Weekly recaps and milestone messages are delivered on time
- All user data remains private and accessible only to the user

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open the main menu with habit tracking options
- **/new** (command, actor: user, command: /new) — Create a new habit with schedule and reminder time
- **Done** (button, actor: user, callback: checkin:done) — Mark current reminder period as completed
- **Skip** (button, actor: user, callback: checkin:skip) — Mark current reminder period as skipped
- **Edit Habit** (button, actor: user, callback: habit:edit) — Modify habit schedule or reminder time
- **/habits** (command, actor: user, command: /habits) — View all active habits with next reminder and streak stats

## Flows

### Onboarding
_Trigger:_ /start

1. Welcome message
2. Detect and confirm timezone
3. Create first habit with schedule and reminder time

_Data touched:_ User, Habit

### Reminder Check-in
_Trigger:_ Scheduled time

1. Send reminder message with Done/Skip buttons
2. Record check-in status
3. Update streak metrics

_Data touched:_ Check-in, Metrics

### Weekly Recap
_Trigger:_ Weekly schedule

1. Generate summary of progress
2. Display emoji timeline and completion rate
3. Include gentle improvement tip if needed

_Data touched:_ Metrics

### Milestone Celebration
_Trigger:_ Streak threshold reached

1. Send encouraging message
2. Show summary of progress
3. Include actionable tip

_Data touched:_ Metrics, Milestones

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram user profile with private data
  - fields: telegram_id, timezone, preferences
- **Habit** _(retention: persistent)_ — User-created habit with schedule and status
  - fields: title, schedule_type, reminder_time, paused, start_date
- **Check-in** _(retention: persistent)_ — User interaction with habit schedule
  - fields: date, status, timestamp
- **Metrics** _(retention: persistent)_ — Progress tracking statistics
  - fields: current_streak, longest_streak, completion_rate
- **Milestones** _(retention: persistent)_ — Configurable progress thresholds
  - fields: threshold_days, celebration_message

## Integrations

- **Telegram** (required) — Private chat notifications and buttons
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Notifications

- Scheduled reminders with check-in buttons
- Weekly progress summary
- Milestone celebration messages
- Retroactive check-in availability until next reminder

## Permissions & privacy

- All user data is private and never shared with other users
- No social features or data sharing between users

## Edge cases

- Timezone-aware date handling for reminders
- Retroactive check-in validation until next scheduled period
- Preventing duplicate check-ins for same period

## Required tests

- End-to-end reminder flow with check-in recording
- Weekly recap generation with accurate metrics
- Milestone detection and celebration message delivery

## Assumptions

- Users are identified by Telegram ID with private chat isolation
- Timezone auto-detection with manual override
- Default milestone thresholds at 7, 21, 30 days

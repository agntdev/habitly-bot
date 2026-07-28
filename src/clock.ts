/** The single clock seam for all habit dates and reminder calculations. */
let clock: () => Date = () => new Date();

export function now(): Date {
  return clock();
}

export function setClockForTests(value: (() => Date) | undefined): void {
  clock = value ?? (() => new Date());
}

export function localDate(timezone: string, value = now()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function timeInZone(timezone: string, value = now()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(value);
}

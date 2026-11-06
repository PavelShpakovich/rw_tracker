const TZ = "Europe/Minsk";
const dateTimeFormat = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatDateTime = (value: Date) => dateTimeFormat.format(value);

/** YYYY-MM-DD → DD.MM.YYYY */
export const formatIsoDate = (isoDate: string) => isoDate.split("-").reverse().join(".");

export const formatPriceByn = (value: number) => `${value.toFixed(2).replace(".", ",")} BYN`;

/** Calendar date in Minsk time as YYYY-MM-DD. */
export function dateInMinsk(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(value);
}

export const tomorrowInMinsk = () => dateInMinsk(new Date(Date.now() + 24 * 60 * 60 * 1000));

/** Russian plural form: plural(1, "событие", "события", "событий"). */
export function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;
  if (mod100 > 10 && mod100 < 20) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

const relativeFormat = new Intl.RelativeTimeFormat("ru-RU", { numeric: "auto" });

/** "5 минут назад", "вчера" and so on, relative to `now`. */
export function formatRelative(value: Date, now = new Date()): string {
  const seconds = Math.round((value.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "только что";
  if (abs < 3600) return relativeFormat.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relativeFormat.format(Math.round(seconds / 3600), "hour");
  return relativeFormat.format(Math.round(seconds / 86_400), "day");
}

/** Compact "5 мин", "2 ч", "3 дн" age of `value`, for narrow layouts. */
export function formatAgeShort(value: Date, now = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - value.getTime()) / 1000));
  if (seconds < 45) return "сейчас";
  if (seconds < 3600) return `${Math.round(seconds / 60)} мин`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} ч`;
  return `${Math.round(seconds / 86_400)} дн`;
}

/** Travel time between "HH:MM" strings; assumes the trip is shorter than 24 hours. */
export function formatDuration(departure: string, arrival: string): string | null {
  const parse = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return Number.isInteger(hours) && Number.isInteger(minutes) ? hours * 60 + minutes : null;
  };
  const from = parse(departure);
  const to = parse(arrival);
  if (from === null || to === null) return null;

  const total = (to - from + 1440) % 1440;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} мин`;
  return minutes === 0 ? `${hours} ч` : `${hours} ч ${minutes} мин`;
}

const dayLabelFormat = new Intl.DateTimeFormat("ru-RU", { timeZone: TZ, day: "numeric", month: "long" });
const timeFormat = new Intl.DateTimeFormat("ru-RU", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

export const formatTime = (value: Date) => timeFormat.format(value);

/** "Сегодня", "Вчера" or "6 ноября" for the Minsk calendar day of `value`. */
export function formatDayLabel(value: Date, now = new Date()): string {
  const day = dateInMinsk(value);
  if (day === dateInMinsk(now)) return "Сегодня";
  if (day === dateInMinsk(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return "Вчера";
  return dayLabelFormat.format(value);
}

/** Station names are typed by hand, so make "брест" read as "Брест". */
export const formatStation = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

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

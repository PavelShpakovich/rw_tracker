type Level = "info" | "warn" | "error";

function write(level: Level, message: string, extra?: unknown) {
  const line = `${new Date().toISOString()} [${level}] ${message}`;
  const sink = level === "info" ? console.log : level === "warn" ? console.warn : console.error;
  if (extra === undefined) sink(line);
  else sink(line, extra);
}

export const log = {
  info: (message: string, extra?: unknown) => write("info", message, extra),
  warn: (message: string, extra?: unknown) => write("warn", message, extra),
  error: (message: string, extra?: unknown) => write("error", message, extra),
};

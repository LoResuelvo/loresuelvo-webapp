export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_WEIGHTS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function getEffectiveLogLevel(): LogLevel {
  const envLevel = process.env.NEXT_PUBLIC_LOG_LEVEL || process.env.LOG_LEVEL;
  if (envLevel && envLevel.toLowerCase() in LOG_LEVEL_WEIGHTS) {
    return envLevel.toLowerCase() as LogLevel;
  }
  if (process.env.NODE_ENV === "test") {
    return "warn";
  }
  if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") {
    return "info";
  }
  return "info";
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = getEffectiveLogLevel();
  return LOG_LEVEL_WEIGHTS[level] >= LOG_LEVEL_WEIGHTS[currentLevel];
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (!shouldLog("debug")) return;
    if (context) {
      console.debug(`[DEBUG] ${message}`, context);
    } else {
      console.debug(`[DEBUG] ${message}`);
    }
  },
  info(message: string, context?: Record<string, unknown>) {
    if (!shouldLog("info")) return;
    if (context) {
      console.info(`[INFO] ${message}`, context);
    } else {
      console.info(`[INFO] ${message}`);
    }
  },
  warn(message: string, context?: Record<string, unknown>) {
    if (!shouldLog("warn")) return;
    if (context) {
      console.warn(`[WARN] ${message}`, context);
    } else {
      console.warn(`[WARN] ${message}`);
    }
  },
  error(message: string, context?: Record<string, unknown>) {
    if (!shouldLog("error")) return;
    if (context) {
      console.error(`[ERROR] ${message}`, context);
    } else {
      console.error(`[ERROR] ${message}`);
    }
  },
};

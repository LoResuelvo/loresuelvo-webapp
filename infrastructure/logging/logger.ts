import { getConfiguredLogLevel, type ConfiguredLogLevel } from "@/infrastructure/config/logging-env";

export type LogLevel = ConfiguredLogLevel;

const LOG_LEVEL_WEIGHTS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function getEffectiveLogLevel(): LogLevel {
  return getConfiguredLogLevel();
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

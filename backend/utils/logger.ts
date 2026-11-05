type LogData = unknown;

export const logger = {
  info: (message: string, data?: LogData) =>
    console.info(
      JSON.stringify({
        level: "info",
        message,
        data,
        time: new Date().toISOString(),
      }),
    ),
  warn: (message: string, data?: LogData) =>
    console.warn(
      JSON.stringify({
        level: "warn",
        message,
        data,
        time: new Date().toISOString(),
      }),
    ),
  error: (error: unknown) =>
    console.error(
      JSON.stringify({
        level: "error",
        message: error instanceof Error ? error.message : String(error),
        time: new Date().toISOString(),
      }),
    ),
};

const clientLogger = {
  error: (msg: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(msg, ...args)
    }
    // In production: silent or send to telemetry endpoint
  },
  info: (msg: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.info(msg, ...args)
    }
  },
  debug: (msg: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug(msg, ...args)
    }
  },
  warn: (msg: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn(msg, ...args)
    }
  },
}

export default clientLogger

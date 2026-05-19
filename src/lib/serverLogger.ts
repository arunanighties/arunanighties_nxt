export const logger = {
  info: (msg: any, ...args: any[]) => {
    if (typeof msg === "object") {
      console.log(JSON.stringify(msg, null, 2), ...args);
    } else {
      console.log(msg, ...args);
    }
  },
  error: (msg: any, ...args: any[]) => {
    if (typeof msg === "object") {
      console.error(JSON.stringify(msg, null, 2), ...args);
    } else {
      console.error(msg, ...args);
    }
  },
  warn: (msg: any, ...args: any[]) => {
    if (typeof msg === "object") {
      console.warn(JSON.stringify(msg, null, 2), ...args);
    } else {
      console.warn(msg, ...args);
    }
  },
  debug: (msg: any, ...args: any[]) => {
    if (typeof msg === "object") {
      console.log(JSON.stringify(msg, null, 2), ...args);
    } else {
      console.log(msg, ...args);
    }
  },
};

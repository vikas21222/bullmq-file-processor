export const LogFactory = {
  getLogger(name) {
    return {
      info: (...args) => {},
      warn: (...args) => {},
      error: (...args) => {},
      debug: (...args) => {},
    };
  }
};

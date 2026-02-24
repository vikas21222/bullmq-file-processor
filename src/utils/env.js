// Centralized environment helpers
export const isTestEnv = () => process.env.NODE_ENV === 'test';
export const isNotTestEnv = () => !isTestEnv();

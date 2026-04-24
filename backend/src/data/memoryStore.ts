export const memoryStore = {
  elections: new Map<string, any>(),
  districts: new Map<string, any>(),
  voters: new Map<string, any>(),
  votes: new Map<string, any>(),
  auditLogs: new Map<string, any>(),
};

export function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

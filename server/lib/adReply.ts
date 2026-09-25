export interface ExternalAdReply {
  title?: string;
  body?: string;
}

export function findExternalAdReply(value: unknown, depth = 0): ExternalAdReply | null {
  if (depth > 6 || value === null || typeof value !== 'object') return null;

  const obj = value as Record<string, unknown>;

  if (obj.externalAdReply && typeof obj.externalAdReply === 'object') {
    const reply = obj.externalAdReply as Record<string, unknown>;
    return {
      title: typeof reply.title === 'string' ? reply.title : undefined,
      body: typeof reply.body === 'string' ? reply.body : undefined,
    };
  }

  for (const key of Object.keys(obj)) {
    const found = findExternalAdReply(obj[key], depth + 1);
    if (found) return found;
  }

  return null;
}

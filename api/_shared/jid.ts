export function jidToNumber(jid: string): string {
  return jid.split('@')[0];
}

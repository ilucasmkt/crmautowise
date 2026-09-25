import { describe, it, expect } from 'vitest';
import { findExternalAdReply } from './adReply';

describe('findExternalAdReply', () => {
  it('returns null when there is no ad reply anywhere in the object', () => {
    expect(findExternalAdReply({ message: { conversation: 'Oi, tudo bem?' } })).toBeNull();
  });

  it('returns null for primitives and null input', () => {
    expect(findExternalAdReply(null)).toBeNull();
    expect(findExternalAdReply('texto')).toBeNull();
    expect(findExternalAdReply(42)).toBeNull();
  });

  it('finds externalAdReply nested inside imageMessage.contextInfo (real Evolution API shape)', () => {
    const realExample = {
      key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false },
      message: {
        imageMessage: {
          url: 'https://mmg.whatsapp.net/...',
          contextInfo: {
            ctwaPayload: 'abc123',
            isForwarded: true,
            externalAdReply: {
              body: 'Volkswagen Nivus Highline 2022 - R$ 111.990,00',
              title: 'APENAS 59.000km',
              ctwaClid: 'AfgIKdvvos5RsMLMihPFyLVyPaOrpXnlSWtX51BDRyTM',
            },
          },
        },
      },
      messageType: 'imageMessage',
    };

    expect(findExternalAdReply(realExample)).toEqual({
      title: 'APENAS 59.000km',
      body: 'Volkswagen Nivus Highline 2022 - R$ 111.990,00',
    });
  });

  it('finds externalAdReply at the top level of data.contextInfo', () => {
    const example = {
      contextInfo: {
        externalAdReply: { title: 'Promo', body: 'Descrição do anúncio' },
      },
    };
    expect(findExternalAdReply(example)).toEqual({ title: 'Promo', body: 'Descrição do anúncio' });
  });

  it('handles a title-only or body-only ad reply', () => {
    expect(findExternalAdReply({ contextInfo: { externalAdReply: { title: 'Só título' } } })).toEqual({
      title: 'Só título',
      body: undefined,
    });
  });
});

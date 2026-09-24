import React, { useEffect, useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import { getWhatsAppMedia } from '../lib/evolutionClient';

interface MediaBubbleProps {
  teamMemberId: string;
  messageId: string;
  type: 'image' | 'audio';
  caption?: string;
  /** Skip fetching and render this data URI directly (used for just-sent media we already have locally). */
  localDataUri?: string;
}

export const MediaBubble: React.FC<MediaBubbleProps> = ({ teamMemberId, messageId, type, caption, localDataUri }) => {
  const [dataUri, setDataUri] = useState<string | null>(localDataUri ?? null);
  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>(localDataUri ? 'idle' : 'loading');

  useEffect(() => {
    if (localDataUri) return;
    let cancelled = false;
    setStatus('loading');
    getWhatsAppMedia(teamMemberId, messageId)
      .then((media) => {
        if (!cancelled) {
          setDataUri(`data:${media.mimetype};base64,${media.base64}`);
          setStatus('idle');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMemberId, messageId, localDataUri]);

  if (status === 'loading') {
    return (
      <div className="w-40 h-28 rounded-xl bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (status === 'error' || !dataUri) {
    return (
      <div className="w-40 h-20 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
        <ImageOff className="w-5 h-5" />
      </div>
    );
  }

  if (type === 'image') {
    return (
      <div>
        <img src={dataUri} alt={caption || 'Imagem recebida'} className="max-w-[220px] rounded-xl" />
        {caption && <p className="text-xs mt-1">{caption}</p>}
      </div>
    );
  }

  return <audio controls src={dataUri} className="max-w-[220px] h-10" />;
};

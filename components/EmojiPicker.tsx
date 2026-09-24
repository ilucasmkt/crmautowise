import React, { useEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😉', '😎', '🤔',
  '🙂', '😅', '😇', '🥰', '😜', '🤗', '😳', '😏', '🙄', '😴',
  '😢', '😭', '😡', '😱', '🥳', '😬', '🤯', '😐', '🙃', '🤩',
  '👍', '👎', '🙏', '👏', '💪', '👋', '🤝', '🙌', '✌️', '👌',
  '❤️', '💔', '🔥', '⭐', '✅', '❌', '🎉', '💯', '⏰', '📌',
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Emojis"
        className="p-2.5 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors shrink-0"
      >
        <Smile className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 grid grid-cols-8 gap-0.5 w-[260px]">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(emoji);
                setOpen(false);
              }}
              className="text-lg leading-none p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { MessageSquare, Send, RefreshCw, User, AlertCircle } from 'lucide-react';
import {
  getWhatsAppChats,
  getWhatsAppMessages,
  sendWhatsAppMessage,
  WhatsAppChat,
  WhatsAppMessage,
} from '../lib/evolutionClient';

interface ConversasViewProps {
  teamMemberId: string;
}

function formatChatTime(timestamp: number | null): string {
  if (!timestamp) return '';
  return new Date(timestamp * 1000).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMessageTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export const ConversasView: React.FC<ConversasViewProps> = ({ teamMemberId }) => {
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [chatsStatus, setChatsStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [chatsError, setChatsError] = useState('');

  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [messagesStatus, setMessagesStatus] = useState<'loading' | 'idle' | 'error'>('idle');
  const [messagesError, setMessagesError] = useState('');

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const loadChats = async () => {
    setChatsStatus('loading');
    try {
      const result = await getWhatsAppChats(teamMemberId);
      setChats(result);
      setChatsStatus('idle');
    } catch (err) {
      setChatsStatus('error');
      setChatsError(err instanceof Error ? err.message : 'Erro ao carregar as conversas');
    }
  };

  useEffect(() => {
    loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMemberId]);

  const loadMessages = async (chat: WhatsAppChat) => {
    setSelectedChat(chat);
    setMessagesStatus('loading');
    try {
      const result = await getWhatsAppMessages(teamMemberId, chat.remoteJid);
      setMessages(result);
      setMessagesStatus('idle');
    } catch (err) {
      setMessagesStatus('error');
      setMessagesError(err instanceof Error ? err.message : 'Erro ao carregar as mensagens');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !draft.trim() || sending) return;
    const text = draft.trim();
    setSending(true);
    try {
      await sendWhatsAppMessage(teamMemberId, selectedChat.remoteJid, text);
      setDraft('');
      setMessages((prev) => [...prev, { id: `local-${Date.now()}`, fromMe: true, text, timestamp: Date.now() / 1000 }]);
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : 'Erro ao enviar a mensagem');
    } finally {
      setSending(false);
    }
  };

  if (chatsStatus === 'error') {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">WhatsApp não conectado</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          {chatsError || 'Não foi possível carregar as conversas. Peça a um administrador para conectar seu WhatsApp em Equipe.'}
        </p>
        <button
          onClick={loadChats}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-xs hover:bg-brand-700"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-brand-600" />
          <span>Conversas</span>
        </h1>
        <button
          onClick={loadChats}
          className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
          title="Atualizar conversas"
        >
          <RefreshCw className={`w-4 h-4 ${chatsStatus === 'loading' ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-[300px_1fr] h-[70vh]">
        {/* Chat list */}
        <div className="border-r border-slate-200 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              {chatsStatus === 'loading' ? 'Carregando conversas...' : 'Nenhuma conversa encontrada.'}
            </div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.remoteJid}
                onClick={() => loadMessages(chat)}
                className={`w-full text-left px-4 py-3 border-b border-slate-100 flex items-center gap-3 transition-colors ${
                  selectedChat?.remoteJid === chat.remoteJid ? 'bg-brand-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {chat.profilePicUrl ? (
                    <img src={chat.profilePicUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-bold text-slate-900 truncate">{chat.name}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">{formatChatTime(chat.lastMessageAt)}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {chat.lastMessageFromMe && <span className="text-slate-400">Você: </span>}
                    {chat.lastMessage || 'Sem mensagens de texto'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Thread */}
        <div className="flex flex-col min-w-0">
          {!selectedChat ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              Selecione uma conversa para ver as mensagens
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {selectedChat.profilePicUrl ? (
                    <img src={selectedChat.profilePicUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{selectedChat.name}</p>
                  <p className="text-[11px] text-slate-400">{selectedChat.sendTo}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
                {messagesStatus === 'loading' ? (
                  <p className="text-xs text-slate-400 text-center">Carregando mensagens...</p>
                ) : messagesStatus === 'error' ? (
                  <p className="text-xs text-red-600 text-center">{messagesError}</p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                        message.fromMe
                          ? 'ml-auto bg-brand-600 text-white rounded-br-sm'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.text}</p>
                      <span className={`block text-[10px] mt-1 ${message.fromMe ? 'text-brand-100' : 'text-slate-400'}`}>
                        {formatMessageTime(message.timestamp)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSend} className="p-3 border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 transition-colors"
                >
                  {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

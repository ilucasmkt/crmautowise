import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, RefreshCw, User, AlertCircle, ImagePlus, Mic, Trash2, Check, UserPlus, X, CheckCircle2 } from 'lucide-react';
import {
  getWhatsAppChats,
  getWhatsAppMessages,
  sendWhatsAppMessage,
  sendWhatsAppMedia,
  WhatsAppChat,
  WhatsAppMessage,
} from '../lib/evolutionClient';
import { MediaBubble } from './MediaBubble';
import { EmojiPicker } from './EmojiPicker';
import { Lead, LeadTemperature } from '../types';

interface ConversasViewProps {
  teamMemberId: string;
  assignedToName: string;
  leads: Lead[];
  onAddLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'lastContactAt'>) => void;
  onNavigateToLeads?: () => void;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na.endsWith(nb) || nb.endsWith(na);
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

export const ConversasView: React.FC<ConversasViewProps> = ({
  teamMemberId,
  assignedToName,
  leads,
  onAddLead,
  onNavigateToLeads,
}) => {
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [chatsStatus, setChatsStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [chatsError, setChatsError] = useState('');

  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [messagesStatus, setMessagesStatus] = useState<'loading' | 'idle' | 'error'>('idle');
  const [messagesError, setMessagesError] = useState('');

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, selectedChat]);

  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadVehicle, setLeadVehicle] = useState('');
  const [leadTemperature, setLeadTemperature] = useState<LeadTemperature>('morno');
  const [leadCreatedMsg, setLeadCreatedMsg] = useState('');

  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const insertEmoji = (emoji: string) => {
    const input = textInputRef.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      input?.focus();
      const pos = start + emoji.length;
      input?.setSelectionRange(pos, pos);
    });
  };

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
    setSendError('');
    setLeadCreatedMsg('');
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
    setSendError('');
    try {
      await sendWhatsAppMessage(teamMemberId, selectedChat.sendTo, text);
      setDraft('');
      setMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, fromMe: true, type: 'text', text, timestamp: Date.now() / 1000 },
      ]);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Erro ao enviar a mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleAttachFile = async (file: File, mediaType: 'image' | 'audio') => {
    if (!selectedChat || sending) return;
    setSending(true);
    setSendError('');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await sendWhatsAppMedia(teamMemberId, selectedChat.sendTo, mediaType, base64, file.type, file.name);
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          fromMe: true,
          type: mediaType,
          timestamp: Date.now() / 1000,
          localDataUri: `data:${file.type};base64,${base64}`,
        },
      ]);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Erro ao enviar o arquivo');
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    setSendError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      setSendError('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  const stopRecording = (shouldSend: boolean) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const chat = selectedChat;
    recorder.onstop = async () => {
      recorder.stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      if (!shouldSend || chunksRef.current.length === 0 || !chat) return;
      const mimetype = recorder.mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mimetype });
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      setSending(true);
      setSendError('');
      try {
        await sendWhatsAppMedia(teamMemberId, chat.sendTo, 'audio', base64, mimetype);
        setMessages((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            fromMe: true,
            type: 'audio',
            timestamp: Date.now() / 1000,
            localDataUri: `data:${mimetype};base64,${base64}`,
          },
        ]);
      } catch (err) {
        setSendError(err instanceof Error ? err.message : 'Erro ao enviar o áudio gravado');
      } finally {
        setSending(false);
      }
    };
    recorder.stop();
  };

  const existingLead = selectedChat ? leads.find((lead) => phonesMatch(lead.phone, selectedChat.sendTo)) : undefined;

  const handleOpenLeadModal = () => {
    if (!selectedChat) return;
    setLeadName(selectedChat.name !== selectedChat.sendTo ? selectedChat.name : '');
    setLeadVehicle('');
    setLeadTemperature('morno');
    setIsLeadModalOpen(true);
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat) return;
    const lastCustomerMessage = [...messages].reverse().find((m) => !m.fromMe && m.type === 'text');
    onAddLead({
      name: leadName.trim() || selectedChat.sendTo,
      phone: selectedChat.sendTo,
      email: '',
      interestedVehicle: leadVehicle.trim(),
      source: 'WhatsApp',
      stage: 'novo',
      temperature: leadTemperature,
      assignedTo: assignedToName,
      notes: lastCustomerMessage
        ? `Criado a partir da conversa no WhatsApp. Última mensagem do cliente: "${lastCustomerMessage.text}"`
        : 'Criado a partir da conversa no WhatsApp.',
    });
    setIsLeadModalOpen(false);
    setLeadCreatedMsg(`Lead "${leadName.trim() || selectedChat.sendTo}" criado com sucesso!`);
    setTimeout(() => setLeadCreatedMsg(''), 4000);
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
        <div className="border-r border-slate-200 overflow-y-auto h-full min-h-0">
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
                  !chat.lastMessageFromMe ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50'
                } ${selectedChat?.remoteJid === chat.remoteJid ? 'ring-2 ring-inset ring-brand-400' : ''}`}
              >
                <div className="relative w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {chat.profilePicUrl ? (
                    <img src={chat.profilePicUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-slate-400" />
                  )}
                  {!chat.lastMessageFromMe && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-white"
                      title="Aguardando sua resposta"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-sm truncate ${!chat.lastMessageFromMe ? 'font-extrabold text-slate-900' : 'font-bold text-slate-900'}`}>
                      {chat.name}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">{formatChatTime(chat.lastMessageAt)}</span>
                  </div>
                  <p className={`text-xs truncate ${!chat.lastMessageFromMe ? 'text-amber-700 font-semibold' : 'text-slate-500'}`}>
                    {chat.lastMessageFromMe && <span className="text-slate-400">Você: </span>}
                    {chat.lastMessage || 'Sem mensagens de texto'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Thread */}
        <div className="flex flex-col min-w-0 h-full min-h-0">
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
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">{selectedChat.name}</p>
                  <p className="text-[11px] text-slate-400">{selectedChat.sendTo}</p>
                </div>
                {existingLead ? (
                  <button
                    type="button"
                    onClick={onNavigateToLeads}
                    title="Já existe um Lead para este contato"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Lead Existente
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenLeadModal}
                    title="Criar Lead a partir desta conversa"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shrink-0 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Criar Lead
                  </button>
                )}
              </div>

              {leadCreatedMsg && (
                <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{leadCreatedMsg}</span>
                </div>
              )}

              <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
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
                      {message.type === 'text' && (
                        <p className="whitespace-pre-wrap break-words">{message.text}</p>
                      )}
                      {(message.type === 'image' || message.type === 'audio') && (
                        <MediaBubble
                          teamMemberId={teamMemberId}
                          messageId={message.id}
                          type={message.type}
                          caption={message.caption}
                          localDataUri={message.localDataUri}
                        />
                      )}
                      {message.type === 'unsupported' && (
                        <p className="italic text-slate-400">[mensagem não suportada]</p>
                      )}
                      <span className={`block text-[10px] mt-1 ${message.fromMe ? 'text-brand-100' : 'text-slate-400'}`}>
                        {formatMessageTime(message.timestamp)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {sendError && (
                <p className="px-3 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">{sendError}</p>
              )}
              {recording ? (
                <div className="p-3 border-t border-slate-200 flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-slate-700">
                    Gravando áudio... {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:
                    {String(recordSeconds % 60).padStart(2, '0')}
                  </span>
                  <button
                    type="button"
                    onClick={() => stopRecording(false)}
                    title="Cancelar gravação"
                    className="p-2.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => stopRecording(true)}
                    title="Enviar áudio"
                    className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSend} className="p-3 border-t border-slate-200 flex items-center gap-2">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAttachFile(file, 'image');
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => imageInputRef.current?.click()}
                    title="Anexar imagem"
                    className="p-2.5 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-50 transition-colors shrink-0"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>
                  <EmojiPicker onSelect={insertEmoji} />
                  <input
                    ref={textInputRef}
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Digite uma mensagem..."
                    className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  {draft.trim() ? (
                    <button
                      type="submit"
                      disabled={sending}
                      className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 transition-colors shrink-0"
                    >
                      {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={sending}
                      onClick={startRecording}
                      title="Gravar áudio"
                      className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 transition-colors shrink-0"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {isLeadModalOpen && selectedChat && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-600" />
                <h2 className="text-base font-bold text-slate-900">Criar Lead a partir da Conversa</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsLeadModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder={selectedChat.sendTo}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  value={selectedChat.sendTo}
                  disabled
                  className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Veículo de Interesse
                </label>
                <input
                  type="text"
                  value={leadVehicle}
                  onChange={(e) => setLeadVehicle(e.target.value)}
                  placeholder="Ex: Corolla XEI 2024"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Temperatura
                </label>
                <select
                  value={leadTemperature}
                  onChange={(e) => setLeadTemperature(e.target.value as LeadTemperature)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="quente">🔥 Quente</option>
                  <option value="morno">🙂 Morno</option>
                  <option value="frio">❄️ Frio</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-400">
                Origem: WhatsApp • Responsável: {assignedToName}
              </p>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLeadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
                >
                  Criar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

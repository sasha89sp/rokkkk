import React, { useMemo, useState } from 'react';
import { RefreshCw, Search, Send, Trash2 } from 'lucide-react';
import { SmsMessage } from '../types/modem';
import { needsUcs2 } from '../utils/ucs2';

interface SmsViewProps {
  messages: SmsMessage[];
  isConnected: boolean;
  isBusy: boolean;
  onRefreshSms: () => void;
  onSendSms: (recipient: string, text: string) => Promise<void>;
  onDeleteSms: (id: number) => Promise<void>;
}

export const SmsView: React.FC<SmsViewProps> = ({
  messages,
  isConnected,
  isBusy,
  onRefreshSms,
  onSendSms,
  onDeleteSms,
}) => {
  const [recipient, setRecipient] = useState('+79165550148');
  const [body, setBody] = useState('');
  const [folderFilter, setFolderFilter] = useState<'all' | 'inbox' | 'sent'>('all');
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const ucs2Required = needsUcs2(body);
  const maxPerSegment = ucs2Required ? 70 : 160;
  const segments = body.length === 0 ? 0 : Math.ceil(body.length / maxPerSegment);

  const filtered = useMemo(() => {
    return messages.filter((m) => {
      if (folderFilter !== 'all' && m.folder !== folderFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          m.sender.toLowerCase().includes(q) || m.text.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [messages, folderFilter, query]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !body.trim() || !isConnected) return;
    setSending(true);
    setStatusNotice(null);
    try {
      await onSendSms(recipient.trim(), body.trim());
      setBody('');
      setStatusNotice(`Сообщение отправлено на ${recipient.trim()} в кодировке UCS2.`);
    } catch (err) {
      setStatusNotice(`Ошибка отправки: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Форма отправки SMS */}
      <section className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-slate-900">Новое SMS-сообщение</h2>
        <p className="text-xs text-slate-500 mt-1">
          Автоматическое кодирование кириллицы в UCS2 (AT+CSCS="UCS2", AT+CSMP=17,167,0,8).
        </p>

        <form onSubmit={handleSend} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="sms-recipient"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Номер получателя
            </label>
            <input
              id="sms-recipient"
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="+79001234567"
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="sms-body"
                className="block text-xs font-medium text-slate-700"
              >
                Текст сообщения
              </label>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {body.length} симв. · {segments} сегм. · {ucs2Required ? 'UCS2' : 'GSM-7'}
              </span>
            </div>
            <textarea
              id="sms-body"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Введите текст SMS на русском или латинице..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-y"
            />
          </div>

          {statusNotice && (
            <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
              {statusNotice}
            </p>
          )}

          <button
            type="submit"
            disabled={!isConnected || sending || !recipient.trim() || !body.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-md transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'Отправка через COM-порт...' : 'Отправить SMS'}</span>
          </button>
        </form>
      </section>

      {/* Журнал SMS на SIM-карте */}
      <section className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Сообщения на SIM-карте
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Всего записей: {messages.length} · Показано: {filtered.length}
            </p>
          </div>

          <button
            type="button"
            onClick={onRefreshSms}
            disabled={!isConnected || isBusy}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
            <span>Прочитать с SIM (AT+CMGL)</span>
          </button>
        </div>

        {/* Фильтры и поиск */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-slate-100">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md self-start">
            {(
              [
                ['all', 'Все'],
                ['inbox', 'Входящие'],
                ['sent', 'Отправленные'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFolderFilter(key)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  folderFilter === key
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по номеру или тексту..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Список SMS */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Сообщений по выбранному фильтру не найдено.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((msg) => (
              <li
                key={msg.id}
                className="py-4 flex items-start justify-between gap-4 hover:bg-slate-50/70 px-2 -mx-2 rounded transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-slate-900">
                      {msg.sender}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{msg.timestamp}</span>
                    <span aria-hidden="true">·</span>
                    <span className={msg.folder === 'sent' ? 'text-blue-700' : 'text-slate-600'}>
                      {msg.folder === 'sent'
                        ? 'Отправлено'
                        : msg.status === 'REC UNREAD'
                          ? 'Новое входящее'
                          : 'Входящее'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">#{msg.id} ({msg.encoding})</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed">
                    {msg.text}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteSms(msg.id)}
                  disabled={!isConnected}
                  title={`Удалить SMS #${msg.id} (AT+CMGD=${msg.id})`}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0 cursor-pointer disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

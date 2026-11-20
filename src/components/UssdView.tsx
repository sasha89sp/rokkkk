import React, { useState } from 'react';
import { Hash, Send, Trash2 } from 'lucide-react';
import { UssdEntry } from '../types/modem';
import { encodeGsm7PackedHex } from '../utils/ucs2';

interface UssdViewProps {
  history: UssdEntry[];
  isConnected: boolean;
  onSendUssd: (code: string) => Promise<void>;
  onClearHistory: () => void;
}

const USSD_PRESETS = [
  { code: '*100#', label: 'Баланс (МТС / МегаФон / Т2)' },
  { code: '*102#', label: 'Баланс (Билайн)' },
  { code: '*100*1#', label: 'Остаток трафика и пакетов' },
  { code: '*105#', label: 'Меню оператора' },
  { code: '*111#', label: 'Личный кабинет МТС' },
  { code: '*205#', label: 'Узнать свой номер' },
];

export const UssdView: React.FC<UssdViewProps> = ({
  history,
  isConnected,
  onSendUssd,
  onClearHistory,
}) => {
  const [code, setCode] = useState('*100#');
  const [sending, setSending] = useState(false);
  const [showRawHex, setShowRawHex] = useState(false);

  const packedPreview = code.trim() ? encodeGsm7PackedHex(code.trim()) : '';

  const handleRun = async (targetCode: string) => {
    if (!targetCode.trim() || !isConnected || sending) return;
    setSending(true);
    try {
      await onSendUssd(targetCode.trim());
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Выполнение USSD-запросов (AT+CUSD)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Для Huawei E173 запрос автоматически упаковывается в 7-bit GSM, а ответ
              декодируется из UCS2-кириллицы.
            </p>
          </div>
          {packedPreview && (
            <div className="text-xs font-mono text-slate-500">
              AT+CUSD=1,&quot;{packedPreview}&quot;,15
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleRun(code);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1 max-w-sm">
            <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="*100#"
              className="w-full pl-9 pr-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={!isConnected || sending || !code.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'Ожидание ответа сети...' : 'Отправить USSD'}</span>
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="text-xs font-medium text-slate-500 mb-2">
            Быстрые команды операторов
          </div>
          <div className="flex flex-wrap gap-2">
            {USSD_PRESETS.map((preset) => (
              <button
                key={preset.code}
                type="button"
                disabled={!isConnected || sending}
                onClick={() => {
                  setCode(preset.code);
                  void handleRun(preset.code);
                }}
                className="px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-md transition-colors disabled:opacity-45 cursor-pointer"
              >
                <span className="font-mono font-semibold text-blue-700 mr-1.5">
                  {preset.code}
                </span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* История ответов USSD */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            История ответов ({history.length})
          </h3>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showRawHex}
                onChange={(e) => setShowRawHex(e.target.checked)}
                className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span>Показывать сырой HEX-ответ</span>
            </label>
            {history.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Очистить</span>
              </button>
            )}
          </div>
        </div>

        {history.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Выберите быстрый код выше или введите свой USSD-запрос (например, *100#).
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((item) => (
              <li key={item.id} className="py-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-semibold text-blue-700">
                    {item.code}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{item.timestamp}</span>
                  <span aria-hidden="true">·</span>
                  <span className={item.status === 'ok' ? 'text-emerald-700' : 'text-red-700'}>
                    {item.status === 'ok' ? 'Успешно' : 'Ошибка'}
                  </span>
                </div>
                <p className="text-sm text-slate-900 leading-relaxed">
                  {item.decodedResponse}
                </p>
                {showRawHex && (
                  <pre className="mt-2 p-2.5 text-xs font-mono bg-slate-900 text-slate-200 rounded-md overflow-x-auto">
                    {`TX: ${item.rawRequest}\nRX: ${item.rawResponse}`}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

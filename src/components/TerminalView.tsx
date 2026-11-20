import React, { useState } from 'react';
import { Download, Send, Trash2 } from 'lucide-react';
import { AtLogEntry } from '../types/modem';

interface TerminalViewProps {
  logs: AtLogEntry[];
  isConnected: boolean;
  onSendRawAt: (command: string) => Promise<void>;
  onClearLogs: () => void;
}

const QUICK_AT_COMMANDS = [
  { cmd: 'ATI', note: 'Модель и прошивка' },
  { cmd: 'AT+CSQ', note: 'Сигнал RSSI' },
  { cmd: 'AT+COPS?', note: 'Оператор' },
  { cmd: 'AT^SYSINFO', note: 'Статус сети' },
  { cmd: 'AT^SYSCFG?', note: 'Режим 2G/3G' },
  { cmd: 'AT^U2DIAG?', note: 'USB-профиль' },
  { cmd: 'AT^CVOICE?', note: 'Голос' },
  { cmd: 'AT^CARDLOCK?', note: 'SIM-Lock' },
  { cmd: 'AT+CPIN?', note: 'Статус SIM' },
  { cmd: 'AT+CIMI', note: 'IMSI' },
];

export const TerminalView: React.FC<TerminalViewProps> = ({
  logs,
  isConnected,
  onSendRawAt,
  onClearLogs,
}) => {
  const [command, setCommand] = useState('ATI');
  const [sending, setSending] = useState(false);

  const execute = async (cmd: string) => {
    if (!cmd.trim() || !isConnected || sending) return;
    setSending(true);
    try {
      await onSendRawAt(cmd.trim());
    } finally {
      setSending(false);
    }
  };

  const handleExportLog = () => {
    const content = [...logs]
      .reverse()
      .map((l) => `[${l.timestamp}] ${l.direction}: ${l.payload}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `huawei_e173_at_log_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-4">
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void execute(command);
            setCommand('');
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Введите AT-команду, например ATI или AT^SYSINFO"
            className="flex-1 px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
          <button
            type="submit"
            disabled={!isConnected || sending || !command.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Отправить</span>
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
          {QUICK_AT_COMMANDS.map((item) => (
            <button
              key={item.cmd}
              type="button"
              disabled={!isConnected || sending}
              onClick={() => void execute(item.cmd)}
              title={item.note}
              className="px-2.5 py-1 text-xs font-mono text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer disabled:opacity-45"
            >
              {item.cmd}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400 font-mono tabular-nums">
            Журнал COM-обмена · записей: {logs.length}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportLog}
              disabled={logs.length === 0}
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Экспорт .txt</span>
            </button>
            <button
              type="button"
              onClick={onClearLogs}
              disabled={logs.length === 0}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 disabled:opacity-40 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистить</span>
            </button>
          </div>
        </div>

        <div className="p-4 h-[440px] overflow-y-auto dark-scroll font-mono text-xs leading-relaxed space-y-2">
          {logs.length === 0 ? (
            <div className="text-slate-500">
              Журнал пуст. Отправьте любую AT-команду выше.
            </div>
          ) : (
            logs.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3">
                <span className="text-slate-500 tabular-nums shrink-0">
                  {entry.timestamp}
                </span>
                <span
                  className={`font-semibold shrink-0 w-7 ${
                    entry.direction === 'TX'
                      ? 'text-blue-400'
                      : entry.direction === 'RX'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                  }`}
                >
                  {entry.direction}
                </span>
                <pre className="text-slate-100 whitespace-pre-wrap break-all m-0 flex-1">
                  {entry.payload}
                </pre>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

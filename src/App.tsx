import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  FolderCode,
  Hash,
  Menu,
  MessageSquare,
  Signal,
  Sliders,
  Terminal,
  X,
} from 'lucide-react';
import { DashboardView } from './components/DashboardView';
import { EngineeringView } from './components/EngineeringView';
import { FlutterSourceView } from './components/FlutterSourceView';
import { SmsView } from './components/SmsView';
import { TerminalView } from './components/TerminalView';
import { UssdView } from './components/UssdView';
import {
  HuaweiModemController,
  INITIAL_EMULATOR_SMS,
  INITIAL_MODEM_INFO,
  isWebSerialSupported,
} from './services/modemController';
import {
  AppTab,
  AtLogEntry,
  ConnectionMode,
  ModemInfo,
  NetworkModeId,
  SignalSample,
  SmsMessage,
  U2DiagMode,
  UssdEntry,
} from './types/modem';
import { downloadFlutterPortableZip } from './utils/exportFlutterZip';

const NAV_ITEMS: Array<{
  id: AppTab;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Обзор и сигнал', icon: Signal },
  { id: 'sms', label: 'SMS-сообщения', icon: MessageSquare },
  { id: 'ussd', label: 'USSD-запросы', icon: Hash },
  { id: 'engineering', label: 'Настройки E173', icon: Sliders },
  { id: 'terminal', label: 'AT-терминал', icon: Terminal },
  { id: 'flutter', label: 'Проект Flutter (Win)', icon: FolderCode },
];

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString('ru-RU', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function makeInitialSignalHistory(): SignalSample[] {
  const base = [19, 20, 20, 21, 22, 21, 20, 21, 22, 21];
  return base.map((csq, i) => ({
    timestamp: `−${(base.length - i) * 3}с`,
    csq,
    rssiDbm: -113 + csq * 2,
    percent: Math.round((csq / 31) * 100),
  }));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('emulator');
  const [modemInfo, setModemInfo] = useState<ModemInfo>(INITIAL_MODEM_INFO);
  const [signalHistory, setSignalHistory] = useState<SignalSample[]>(
    makeInitialSignalHistory
  );
  const [smsList, setSmsList] = useState<SmsMessage[]>(INITIAL_EMULATOR_SMS);
  const [ussdHistory, setUssdHistory] = useState<UssdEntry[]>([]);
  const [logs, setLogs] = useState<AtLogEntry[]>([
    {
      id: 'init-1',
      timestamp: nowTimeLabel(),
      direction: 'SYS',
      payload:
        'Активен локальный эмулятор Huawei E173 (FW 11.126.85.00.209). Подключите реальный USB-модем кнопкой «Подключить USB COM» или скачайте портативный Flutter-проект.',
    },
  ]);
  const [isBusy, setIsBusy] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const appendLog = useCallback((direction: 'TX' | 'RX' | 'SYS', payload: string) => {
    setLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: nowTimeLabel(),
        direction,
        payload,
      },
      ...prev.slice(0, 249),
    ]);
  }, []);

  const controllerRef = useRef<HuaweiModemController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new HuaweiModemController(appendLog);
  }

  // Периодический опрос уровня сигнала каждые 3 секунды при подключённом модеме
  useEffect(() => {
    if (connectionMode === 'disconnected') return;

    const timer = window.setInterval(async () => {
      try {
        const ctrl = controllerRef.current;
        if (!ctrl || ctrl.getMode() === 'disconnected') return;
        const sample = await ctrl.pollSignal();
        setModemInfo((prev) => ({
          ...prev,
          csq: sample.csq,
          rssiDbm: sample.rssiDbm,
          signalPercent: sample.signalPercent,
        }));
        setSignalHistory((prev) => [
          ...prev.slice(-29),
          {
            timestamp: nowTimeLabel(),
            csq: sample.csq,
            rssiDbm: sample.rssiDbm,
            percent: sample.signalPercent,
          },
        ]);
      } catch {
        // Ошибки одиночного опроса не прерывают сессию
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [connectionMode]);

  const handleConnectWebSerial = async () => {
    setIsBusy(true);
    setErrorBanner(null);
    try {
      const info = await controllerRef.current!.connectWebSerial(115200);
      setConnectionMode('webserial');
      setModemInfo(info);
      setSignalHistory([
        {
          timestamp: nowTimeLabel(),
          csq: info.csq,
          rssiDbm: info.rssiDbm,
          percent: info.signalPercent,
        },
      ]);
      const msgs = await controllerRef.current!.fetchSmsList();
      setSmsList(msgs);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.toLowerCase().includes('no port selected')) {
        setErrorBanner(message);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleConnectEmulator = () => {
    setErrorBanner(null);
    const info = controllerRef.current!.connectEmulator();
    setConnectionMode('emulator');
    setModemInfo(info);
    setSmsList(controllerRef.current!.getEmulatorSms());
    setSignalHistory(makeInitialSignalHistory());
  };

  const handleDisconnect = async () => {
    await controllerRef.current!.disconnect();
    setConnectionMode('disconnected');
  };

  const handleRefreshInfo = async () => {
    setIsBusy(true);
    setErrorBanner(null);
    try {
      const info = await controllerRef.current!.probeDeviceInfo(
        modemInfo.portLabel,
        modemInfo.baudRate
      );
      setModemInfo(info);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : String(err));
    } finally {
      setIsBusy(false);
    }
  };

  const handleSetNetworkMode = async (mode: NetworkModeId) => {
    setIsBusy(true);
    try {
      await controllerRef.current!.setNetworkMode(mode);
      if (connectionMode === 'emulator') {
        setModemInfo(controllerRef.current!.getEmulatorState());
      } else {
        setModemInfo((prev) => ({ ...prev, networkMode: mode }));
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleSetU2Diag = async (mode: U2DiagMode) => {
    setIsBusy(true);
    try {
      await controllerRef.current!.setU2Diag(mode);
      setModemInfo((prev) => ({ ...prev, u2diag: mode }));
    } finally {
      setIsBusy(false);
    }
  };

  const handleSetVoice = async (enabled: boolean) => {
    setIsBusy(true);
    try {
      await controllerRef.current!.setVoiceEnabled(enabled);
      setModemInfo((prev) => ({ ...prev, voiceEnabled: enabled }));
    } finally {
      setIsBusy(false);
    }
  };

  const handleToggleRadio = async (on: boolean) => {
    setIsBusy(true);
    try {
      await controllerRef.current!.toggleRadio(on);
      if (connectionMode === 'emulator') {
        setModemInfo(controllerRef.current!.getEmulatorState());
      } else {
        setModemInfo((prev) => ({ ...prev, radioOn: on }));
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleRebootModem = async () => {
    setIsBusy(true);
    try {
      await controllerRef.current!.rebootModem();
    } finally {
      setIsBusy(false);
    }
  };

  const handleUnlockCard = async (nck: string) => {
    const res = await controllerRef.current!.unlockCard(nck);
    if (connectionMode === 'emulator') {
      setModemInfo(controllerRef.current!.getEmulatorState());
    }
    return res;
  };

  const handleRefreshSms = async () => {
    setIsBusy(true);
    try {
      const list = await controllerRef.current!.fetchSmsList();
      setSmsList(list);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSendSms = async (recipient: string, text: string) => {
    const sent = await controllerRef.current!.sendSms(recipient, text);
    setSmsList((prev) => [sent, ...prev]);
  };

  const handleDeleteSms = async (id: number) => {
    await controllerRef.current!.deleteSms(id);
    setSmsList((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSendUssd = async (code: string) => {
    const res = await controllerRef.current!.sendUssd(code);
    setUssdHistory((prev) => [
      {
        id: `${Date.now()}`,
        timestamp: nowTimeLabel(),
        code,
        rawRequest: res.rawRequest,
        rawResponse: res.rawResponse,
        decodedResponse: res.decodedResponse,
        status: res.status,
      },
      ...prev,
    ]);
  };

  const handleSendRawAt = async (cmd: string) => {
    await controllerRef.current!.sendAtCommand(cmd);
  };

  const handleDownloadZip = async () => {
    try {
      await downloadFlutterPortableZip();
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : String(err));
    }
  };

  const activeNavTitle =
    NAV_ITEMS.find((item) => item.id === activeTab)?.label || 'Обзор и сигнал';

  const isConnected = connectionMode !== 'disconnected';

  const connectionLabel =
    connectionMode === 'webserial'
      ? 'USB COM подключён'
      : connectionMode === 'emulator'
        ? 'Эмулятор E173'
        : 'Отключён';

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
        <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
          Huawei E173 Manager
        </span>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900"
          aria-label="Закрыть меню"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Разделы программы">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-blue-50 text-blue-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  active ? 'text-blue-700' : 'text-slate-400'
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Лаконичный блок текущего состояния порта внизу сайдбара */}
      <div className="p-4 border-t border-slate-200 text-xs space-y-1.5">
        <div className="flex items-center gap-2 text-slate-800 font-medium">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              connectionMode === 'webserial'
                ? 'bg-emerald-600'
                : connectionMode === 'emulator'
                  ? 'bg-blue-600'
                  : 'bg-slate-300'
            }`}
          />
          <span>{connectionLabel}</span>
        </div>
        <div className="text-slate-500 font-mono truncate tabular-nums">
          {isConnected ? `${modemInfo.rssiDbm} dBm · ${modemInfo.networkTech}` : 'Нет соединения'}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Десктопный сайдбар (248px) */}
      <aside className="hidden lg:block w-[248px] shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Мобильный сайдбар-шторка */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-white h-full border-r border-slate-200 z-10">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Основная рабочая область */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Верхняя панель по контракту SaaS Dashboard: Хлебные крошки слева, 1 основное действие справа */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 -ml-1.5 text-slate-600 hover:text-slate-900"
              aria-label="Открыть меню"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 hidden sm:inline whitespace-nowrap">
                Huawei E173 Portable
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900 truncate">
                {activeNavTitle}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleDownloadZip()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Скачать Flutter (.zip)</span>
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1280px] w-full mx-auto">
          {errorBanner && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm flex items-center justify-between gap-4">
              <span>{errorBanner}</span>
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                className="text-xs font-medium text-red-700 hover:text-red-900 cursor-pointer shrink-0"
              >
                Закрыть
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              connectionMode={connectionMode}
              modemInfo={modemInfo}
              signalHistory={signalHistory}
              isBusy={isBusy}
              webSerialSupported={isWebSerialSupported()}
              onConnectWebSerial={() => void handleConnectWebSerial()}
              onConnectEmulator={handleConnectEmulator}
              onDisconnect={() => void handleDisconnect()}
              onRefreshInfo={() => void handleRefreshInfo()}
              onSetNetworkMode={(mode) => void handleSetNetworkMode(mode)}
              onDownloadFlutterZip={() => void handleDownloadZip()}
              onOpenFlutterTab={() => setActiveTab('flutter')}
            />
          )}

          {activeTab === 'sms' && (
            <SmsView
              messages={smsList}
              isConnected={isConnected}
              isBusy={isBusy}
              onRefreshSms={() => void handleRefreshSms()}
              onSendSms={handleSendSms}
              onDeleteSms={handleDeleteSms}
            />
          )}

          {activeTab === 'ussd' && (
            <UssdView
              history={ussdHistory}
              isConnected={isConnected}
              onSendUssd={handleSendUssd}
              onClearHistory={() => setUssdHistory([])}
            />
          )}

          {activeTab === 'engineering' && (
            <EngineeringView
              modemInfo={modemInfo}
              isConnected={isConnected}
              isBusy={isBusy}
              onSetNetworkMode={handleSetNetworkMode}
              onSetU2Diag={handleSetU2Diag}
              onSetVoiceEnabled={handleSetVoice}
              onToggleRadio={handleToggleRadio}
              onRebootModem={handleRebootModem}
              onUnlockCard={handleUnlockCard}
            />
          )}

          {activeTab === 'terminal' && (
            <TerminalView
              logs={logs}
              isConnected={isConnected}
              onSendRawAt={handleSendRawAt}
              onClearLogs={() => setLogs([])}
            />
          )}

          {activeTab === 'flutter' && (
            <FlutterSourceView onDownloadZip={handleDownloadZip} />
          )}
        </main>
      </div>
    </div>
  );
}

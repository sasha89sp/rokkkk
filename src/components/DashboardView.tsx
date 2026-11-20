import React from 'react';
import {
  Download,
  Plug,
  Radio,
  RefreshCw,
  Signal,
  Smartphone,
  Unplug,
} from 'lucide-react';
import {
  ConnectionMode,
  ModemInfo,
  NETWORK_MODES,
  NetworkModeId,
  SignalSample,
} from '../types/modem';
import { getSignalQualityLabel } from '../utils/ucs2';

interface DashboardViewProps {
  connectionMode: ConnectionMode;
  modemInfo: ModemInfo;
  signalHistory: SignalSample[];
  isBusy: boolean;
  webSerialSupported: boolean;
  onConnectWebSerial: () => void;
  onConnectEmulator: () => void;
  onDisconnect: () => void;
  onRefreshInfo: () => void;
  onSetNetworkMode: (mode: NetworkModeId) => void;
  onDownloadFlutterZip: () => void;
  onOpenFlutterTab: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  connectionMode,
  modemInfo,
  signalHistory,
  isBusy,
  webSerialSupported,
  onConnectWebSerial,
  onConnectEmulator,
  onDisconnect,
  onRefreshInfo,
  onSetNetworkMode,
  onDownloadFlutterZip,
  onOpenFlutterTab,
}) => {
  const isConnected = connectionMode !== 'disconnected';
  const quality = getSignalQualityLabel(modemInfo.rssiDbm);

  // Построение SVG-графика уровня сигнала (-113 .. -51 dBm)
  const chartWidth = 640;
  const chartHeight = 148;
  const minDbm = -113;
  const maxDbm = -51;

  const points = signalHistory.map((sample, idx) => {
    const x =
      signalHistory.length <= 1
        ? chartWidth
        : (idx / (signalHistory.length - 1)) * chartWidth;
    const clamped = Math.max(minDbm, Math.min(maxDbm, sample.rssiDbm));
    const norm = (clamped - minDbm) / (maxDbm - minDbm);
    const y = chartHeight - 12 - norm * (chartHeight - 24);
    return { x, y, sample };
  });

  const polylinePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    points.length > 1
      ? `M ${points[0].x.toFixed(1)},${chartHeight} ` +
        points.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
        ` L ${points[points.length - 1].x.toFixed(1)},${chartHeight} Z`
      : '';

  const signalBars = [
    modemInfo.signalPercent >= 15,
    modemInfo.signalPercent >= 35,
    modemInfo.signalPercent >= 55,
    modemInfo.signalPercent >= 75,
    modemInfo.signalPercent >= 90,
  ];

  const qualityTextColor =
    !isConnected || !modemInfo.radioOn
      ? 'text-slate-500'
      : quality.tone === 'good'
        ? 'text-emerald-700'
        : quality.tone === 'fair'
          ? 'text-amber-700'
          : 'text-red-700';

  return (
    <div className="space-y-6">
      {/* Панель подключения COM-порта / Web Serial */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-slate-900">
              Подключение к модему Huawei E173
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-mono text-slate-700">
                {isConnected ? modemInfo.portLabel : 'Порт не открыт'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{modemInfo.baudRate} бит/с (8N1)</span>
              <span aria-hidden="true">·</span>
              <span>
                {connectionMode === 'webserial'
                  ? 'Реальный USB COM-порт (Web Serial)'
                  : connectionMode === 'emulator'
                    ? 'Встроенный эмулятор AT-команд E173'
                    : 'Ожидание подключения'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {webSerialSupported ? (
              <button
                type="button"
                onClick={onConnectWebSerial}
                disabled={isBusy}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plug className="w-4 h-4" />
                <span>Подключить USB COM</span>
              </button>
            ) : (
              <span className="text-xs text-slate-500">
                Web Serial доступен в Chrome / Edge на Windows
              </span>
            )}

            {connectionMode !== 'emulator' ? (
              <button
                type="button"
                onClick={onConnectEmulator}
                disabled={isBusy}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Radio className="w-4 h-4" />
                <span>Эмулятор E173</span>
              </button>
            ) : null}

            {isConnected && (
              <>
                <button
                  type="button"
                  onClick={onRefreshInfo}
                  disabled={isBusy}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isBusy ? 'animate-spin' : ''}`} />
                  <span>Опросить</span>
                </button>
                <button
                  type="button"
                  onClick={onDisconnect}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Unplug className="w-4 h-4" />
                  <span>Отключить</span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 4 ключевых показателя в единой сетке без вложенных карточек */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Уровень сигнала RSSI</span>
            <div className="flex items-end gap-0.5 h-4" aria-hidden="true">
              {signalBars.map((active, i) => (
                <span
                  key={i}
                  style={{ height: `${(i + 1) * 3}px` }}
                  className={`w-1 rounded-xs ${
                    isConnected && modemInfo.radioOn && active
                      ? quality.tone === 'good'
                        ? 'bg-emerald-600'
                        : quality.tone === 'fair'
                          ? 'bg-amber-500'
                          : 'bg-red-600'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900 font-mono tabular-nums">
              {isConnected && modemInfo.radioOn ? `${modemInfo.rssiDbm} dBm` : '—'}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums">
            <span className={`font-sans font-medium ${qualityTextColor}`}>
              {isConnected && modemInfo.radioOn ? quality.label : 'Нет сигнала'}
            </span>
            <span aria-hidden="true">·</span>
            <span>CSQ {isConnected ? modemInfo.csq : '—'}</span>
            <span aria-hidden="true">·</span>
            <span>{isConnected ? `${modemInfo.signalPercent}%` : '0%'}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <span className="text-xs font-medium text-slate-500">Оператор и стандарт</span>
          <div className="mt-2 text-2xl font-semibold text-slate-900 truncate">
            {isConnected ? modemInfo.operator : 'Не подключён'}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-mono font-medium text-slate-700">
              {isConnected ? modemInfo.networkTech : '—'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{modemInfo.radioOn ? 'Радиомодуль включён' : 'Авиарежим (CFUN=0)'}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <span className="text-xs font-medium text-slate-500">Состояние SIM и блокировки</span>
          <div className="mt-2 text-2xl font-semibold text-slate-900 font-mono">
            {isConnected ? modemInfo.simStatus : '—'}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <span
              className={
                modemInfo.cardLockStatus === 'UNLOCKED'
                  ? 'text-emerald-700 font-medium'
                  : 'text-amber-700 font-medium'
              }
            >
              {modemInfo.cardLockStatus === 'UNLOCKED' ? 'SIM-Lock снят' : 'Заблокирован NCK'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Попыток: {modemInfo.cardLockAttemptsLeft}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <span className="text-xs font-medium text-slate-500">Режим USB и голос</span>
          <div className="mt-2 text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            U2DIAG = {modemInfo.u2diag}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <span>
              {modemInfo.u2diag === 0
                ? 'Только модем'
                : modemInfo.u2diag === 256
                  ? 'Модем + SD'
                  : modemInfo.u2diag === 257
                    ? 'Модем + CD'
                    : 'Заводской'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{modemInfo.voiceEnabled ? 'Голос активен' : 'Голос выключен'}</span>
          </div>
        </div>
      </section>

      {/* Основная 2-колоночная область: график сигнала + паспорт модема */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* График RSSI и быстрый переключатель сети */}
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Динамика уровня сигнала (AT+CSQ)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Периодический опрос каждые 3 секунды · диапазон от −113 до −51 dBm
                </p>
              </div>
              <div className="text-right font-mono tabular-nums text-xs text-slate-600">
                <div>Текущий: {isConnected ? `${modemInfo.rssiDbm} dBm` : '—'}</div>
                <div className="text-slate-400">Точек: {signalHistory.length}</div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-md bg-slate-50/70 p-3">
              {signalHistory.length > 1 ? (
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-40 overflow-visible"
                  role="img"
                  aria-label="График уровня сигнала RSSI в dBm"
                >
                  <defs>
                    <linearGradient id="rssiFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  {/* Опорные горизонтальные линии (-65, -85, -105 dBm) */}
                  {[-65, -85, -105].map((refDbm) => {
                    const norm = (refDbm - minDbm) / (maxDbm - minDbm);
                    const y = chartHeight - 12 - norm * (chartHeight - 24);
                    return (
                      <g key={refDbm}>
                        <line
                          x1={0}
                          y1={y}
                          x2={chartWidth}
                          y2={y}
                          stroke="#CBD5E1"
                          strokeDasharray="3 4"
                          strokeWidth="1"
                        />
                        <text
                          x={4}
                          y={y - 4}
                          fill="#64748B"
                          fontSize="10"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {refDbm} dBm
                        </text>
                      </g>
                    );
                  })}

                  <path d={areaPath} fill="url(#rssiFill)" />
                  <polyline
                    fill="none"
                    stroke="#1D4ED8"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={polylinePoints}
                  />
                  {points.length > 0 && (
                    <circle
                      cx={points[points.length - 1].x}
                      cy={points[points.length - 1].y}
                      r="3.5"
                      fill="#1D4ED8"
                    />
                  )}
                </svg>
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-slate-500">
                  Подключите модем для сбора телеметрии сигнала
                </div>
              )}
            </div>
          </div>

          {/* Быстрый выбор режима сети AT^SYSCFG */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-medium text-slate-700">
                Быстрое переключение режима сети (AT^SYSCFG)
              </span>
              <span className="text-xs font-mono text-slate-400">
                {NETWORK_MODES.find((m) => m.id === modemInfo.networkMode)?.atCommand}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {NETWORK_MODES.map((mode) => {
                const active = modemInfo.networkMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    disabled={!isConnected || isBusy}
                    onClick={() => onSetNetworkMode(mode.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 ${
                      active
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {mode.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Паспорт устройства Huawei E173 */}
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Паспорт устройства
              </h2>
              <Smartphone className="w-4 h-4 text-slate-400" />
            </div>

            <dl className="divide-y divide-slate-100 text-sm">
              {[
                ['Производитель', modemInfo.manufacturer],
                ['Модель', `Huawei ${modemInfo.model}`],
                ['Версия прошивки', modemInfo.revision],
                ['IMEI', modemInfo.imei],
                ['IMSI SIM-карты', modemInfo.imsi],
                ['Интерфейс COM', modemInfo.portLabel],
              ].map(([label, value]) => (
                <div key={label} className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 shrink-0">{label}</dt>
                  <dd className="font-mono text-xs sm:text-sm text-slate-900 tabular-nums text-right truncate">
                    {isConnected ? value : '—'}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Портативная сборка Flutter для Windows */}
          <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Портативный Flutter-проект для Windows
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Готовый код с GitHub Actions (сборка .exe в облаке) и Win32 COM-портом
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenFlutterTab}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Открыть код
              </button>
              <button
                type="button"
                onClick={onDownloadFlutterZip}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Скачать ZIP</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Справка по выбору COM-порта Huawei E173 */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <Signal className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" />
          <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-900">
              Какой порт выбирать в Windows для Huawei E173:{' '}
            </span>
            В Диспетчере устройств выберите{' '}
            <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
              HUAWEI Mobile Connect - 3G PC UI Interface
            </code>
            . В отличие от основного модемного порта, интерфейс PC UI позволяет читать уровень
            сигнала, отправлять SMS и выполнять USSD-запросы без разрыва интернет-соединения.
          </div>
        </div>
      </section>
    </div>
  );
};

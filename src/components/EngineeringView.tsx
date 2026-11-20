import React, { useState } from 'react';
import { KeyRound, Power, RotateCcw, Usb, Volume2 } from 'lucide-react';
import {
  ModemInfo,
  NETWORK_MODES,
  NetworkModeId,
  U2DIAG_MODES,
  U2DiagMode,
} from '../types/modem';

interface EngineeringViewProps {
  modemInfo: ModemInfo;
  isConnected: boolean;
  isBusy: boolean;
  onSetNetworkMode: (mode: NetworkModeId) => Promise<void>;
  onSetU2Diag: (mode: U2DiagMode) => Promise<void>;
  onSetVoiceEnabled: (enabled: boolean) => Promise<void>;
  onToggleRadio: (on: boolean) => Promise<void>;
  onRebootModem: () => Promise<void>;
  onUnlockCard: (nck: string) => Promise<string>;
}

export const EngineeringView: React.FC<EngineeringViewProps> = ({
  modemInfo,
  isConnected,
  isBusy,
  onSetNetworkMode,
  onSetU2Diag,
  onSetVoiceEnabled,
  onToggleRadio,
  onRebootModem,
  onUnlockCard,
}) => {
  const [nckInput, setNckInput] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    setActionMessage(null);
    try {
      await fn();
      setActionMessage(`Выполнено: ${label}`);
    } catch (err) {
      setActionMessage(
        `Ошибка (${label}): ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  return (
    <div className="space-y-6">
      {actionMessage && (
        <div className="bg-white border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-800 flex items-center justify-between gap-4">
          <span>{actionMessage}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            Скрыть
          </button>
        </div>
      )}

      {/* USB-композиция AT^U2DIAG */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Режим USB-композиции Huawei E173 (AT^U2DIAG)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Отключение встроенного виртуального CD (Zero-CD) и картридера ускоряет
              инициализацию модема в Windows и роутерах. Изменения вступают в силу после
              переподключения USB.
            </p>
          </div>
          <Usb className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {U2DIAG_MODES.map((item) => {
            const active = modemInfo.u2diag === item.value;
            return (
              <button
                key={item.value}
                type="button"
                disabled={!isConnected || isBusy}
                onClick={() =>
                  void runAction(item.atCommand, () => onSetU2Diag(item.value))
                }
                className={`text-left p-4 rounded-md border transition-colors cursor-pointer disabled:opacity-50 ${
                  active
                    ? 'border-blue-700 bg-blue-50/40'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {item.title}
                  </span>
                  <span className="text-xs font-mono text-blue-700">
                    {item.atCommand}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5">{item.devices}</p>
                {active && (
                  <p className="text-xs font-medium text-blue-700 mt-2">
                    Текущий активный профиль
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Приоритет и стандарт сети AT^SYSCFG */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-slate-900">
          Выбор диапазона и стандарта связи (AT^SYSCFG)
        </h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Фиксация «Только 3G» предотвращает сброс соединения в медленный EDGE при слабом
          сигнале.
        </p>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
          {NETWORK_MODES.map((mode) => {
            const active = modemInfo.networkMode === mode.id;
            return (
              <div
                key={mode.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {mode.label}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {mode.atCommand}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{mode.description}</p>
                </div>

                <button
                  type="button"
                  disabled={!isConnected || isBusy || active}
                  onClick={() =>
                    void runAction(mode.label, () => onSetNetworkMode(mode.id))
                  }
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    active
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-45'
                  }`}
                >
                  {active ? 'Выбран' : 'Применить'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Нижний ряд: Голос + Разблокировка NCK + Питание радиомодуля */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Голосовые функции (AT^CVOICE)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Управление голосовым каналом на Huawei E173 (0 — включён, 1 — выключен).
              </p>
            </div>
            <Volume2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-sm text-slate-700">
              Статус:{' '}
              <strong className="font-semibold text-slate-900">
                {modemInfo.voiceEnabled ? 'Активирован (AT^CVOICE=0)' : 'Отключён (AT^CVOICE=1)'}
              </strong>
            </span>
            <button
              type="button"
              disabled={!isConnected || isBusy}
              onClick={() =>
                void runAction(
                  modemInfo.voiceEnabled ? 'Отключение голоса' : 'Включение голоса',
                  () => onSetVoiceEnabled(!modemInfo.voiceEnabled)
                )
              }
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45"
            >
              {modemInfo.voiceEnabled ? 'Отключить голос' : 'Включить голос'}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Питание радиомодуля и перезагрузка
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Команды AT+CFUN=0 / AT+CFUN=1 и программный сброс AT+CFUN=1,1.
                </p>
              </div>
              <Power className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                disabled={!isConnected || isBusy}
                onClick={() =>
                  void runAction(
                    modemInfo.radioOn ? 'Отключение радиомодуля' : 'Включение радиомодуля',
                    () => onToggleRadio(!modemInfo.radioOn)
                  )
                }
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer disabled:opacity-45"
              >
                {modemInfo.radioOn ? 'Выключить радио (CFUN=0)' : 'Включить радио (CFUN=1)'}
              </button>

              <button
                type="button"
                disabled={!isConnected || isBusy}
                onClick={() =>
                  void runAction('Перезагрузка модема (AT+CFUN=1,1)', onRebootModem)
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-md transition-colors cursor-pointer disabled:opacity-45"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Перезагрузить модем</span>
              </button>
            </div>
          </div>
        </section>

        {/* Блокировка оператора AT^CARDLOCK */}
        <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Снятие блокировки оператора (AT^CARDLOCK)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Проверка статуса SIM-Lock и ввод 8-значного кода разблокировки NCK для
                  работы с SIM-картами любых операторов.
                </p>
              </div>
              <KeyRound className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            </div>

            <dl className="mt-4 divide-y divide-slate-100 text-xs">
              <div className="py-2 flex justify-between">
                <dt className="text-slate-500">Текущий статус</dt>
                <dd className="font-mono font-semibold text-slate-900">
                  {modemInfo.cardLockStatus === 'UNLOCKED'
                    ? '2 · Разблокирован'
                    : '1 · Заблокирован'}
                </dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-500">Осталось попыток ввода NCK</dt>
                <dd className="font-mono tabular-nums text-slate-900">
                  {modemInfo.cardLockAttemptsLeft} из 10
                </dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-500">IMEI устройства</dt>
                <dd className="font-mono tabular-nums text-slate-900">
                  {modemInfo.imei}
                </dd>
              </div>
            </dl>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!nckInput.trim()) return;
              void runAction('Ввод NCK-кода', async () => {
                await onUnlockCard(nckInput);
                setNckInput('');
              });
            }}
            className="mt-4 pt-4 border-t border-slate-100 flex gap-2"
          >
            <input
              type="text"
              value={nckInput}
              onChange={(e) => setNckInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="8-значный NCK код"
              className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              disabled={!isConnected || nckInput.length !== 8}
              className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-45 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Отправить NCK
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

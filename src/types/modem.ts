export type ConnectionMode = 'disconnected' | 'emulator' | 'webserial';

export type NetworkModeId = 'auto' | '3g_only' | '2g_only' | '3g_pref' | '2g_pref';

export type U2DiagMode = 0 | 255 | 256 | 257;

export type AppTab =
  | 'dashboard'
  | 'sms'
  | 'ussd'
  | 'engineering'
  | 'terminal'
  | 'flutter';

export interface SignalSample {
  timestamp: string;
  rssiDbm: number;
  csq: number;
  percent: number;
}

export interface ModemInfo {
  manufacturer: string;
  model: string;
  revision: string;
  imei: string;
  imsi: string;
  simStatus: 'READY' | 'SIM PIN' | 'SIM PUK' | 'NO SIM';
  operator: string;
  networkTech: 'HSPA+' | 'HSDPA' | 'WCDMA' | 'EDGE' | 'GPRS' | 'Нет сети';
  networkMode: NetworkModeId;
  csq: number; // 0-31, 99 = unknown
  rssiDbm: number; // -113 to -51 dBm
  signalPercent: number; // 0-100
  ber: number;
  u2diag: U2DiagMode;
  voiceEnabled: boolean;
  cardLockStatus: 'UNLOCKED' | 'LOCKED';
  cardLockAttemptsLeft: number;
  radioOn: boolean;
  portLabel: string;
  baudRate: number;
}

export interface SmsMessage {
  id: number;
  folder: 'inbox' | 'sent';
  status: 'REC UNREAD' | 'REC READ' | 'STO SENT';
  sender: string;
  timestamp: string;
  text: string;
  encoding: 'UCS2' | 'GSM7';
}

export interface UssdEntry {
  id: string;
  timestamp: string;
  code: string;
  rawRequest: string;
  rawResponse: string;
  decodedResponse: string;
  status: 'ok' | 'error';
}

export interface AtLogEntry {
  id: string;
  timestamp: string;
  direction: 'TX' | 'RX' | 'SYS';
  payload: string;
}

export const NETWORK_MODES: Array<{
  id: NetworkModeId;
  label: string;
  shortLabel: string;
  atCommand: string;
  description: string;
}> = [
  {
    id: 'auto',
    label: 'Автовыбор (3G / 2G)',
    shortLabel: 'Авто',
    atCommand: 'AT^SYSCFG=2,0,3FFFFFFF,1,2',
    description: 'Модем автоматически выбирает лучший доступный стандарт сети.',
  },
  {
    id: '3g_only',
    label: 'Только 3G (WCDMA / HSPA)',
    shortLabel: 'Только 3G',
    atCommand: 'AT^SYSCFG=14,2,3FFFFFFF,1,2',
    description: 'Принудительная работа в UMTS/HSDPA без сброса в EDGE.',
  },
  {
    id: '3g_pref',
    label: 'Приоритет 3G',
    shortLabel: 'Приоритет 3G',
    atCommand: 'AT^SYSCFG=2,2,3FFFFFFF,1,2',
    description: 'Предпочитает 3G, переходит в 2G только при потере сигнала.',
  },
  {
    id: '2g_only',
    label: 'Только 2G (GSM / EDGE)',
    shortLabel: 'Только 2G',
    atCommand: 'AT^SYSCFG=13,1,3FFFFFFF,1,2',
    description: 'Экономичный и дальнобойный режим для SMS, USSD и голоса.',
  },
  {
    id: '2g_pref',
    label: 'Приоритет 2G',
    shortLabel: 'Приоритет 2G',
    atCommand: 'AT^SYSCFG=2,1,3FFFFFFF,1,2',
    description: 'Предпочитает GSM/EDGE с переходом в 3G при необходимости.',
  },
];

export const U2DIAG_MODES: Array<{
  value: U2DiagMode;
  title: string;
  atCommand: string;
  devices: string;
  recommended?: boolean;
}> = [
  {
    value: 0,
    title: 'Только модем (Режим 0)',
    atCommand: 'AT^U2DIAG=0',
    devices: 'Modem + PC UI Interface (Zero-CD и MicroSD отключены)',
    recommended: true,
  },
  {
    value: 256,
    title: 'Модем + Картридер (Режим 256)',
    atCommand: 'AT^U2DIAG=256',
    devices: 'Modem + PC UI Interface + MicroSD (виртуальный CD отключён)',
  },
  {
    value: 257,
    title: 'Модем + Виртуальный CD (Режим 257)',
    atCommand: 'AT^U2DIAG=257',
    devices: 'Modem + PC UI Interface + CD-ROM с драйверами',
  },
  {
    value: 255,
    title: 'Заводской режим (Режим 255)',
    atCommand: 'AT^U2DIAG=255',
    devices: 'Modem + PC UI Interface + CD-ROM + MicroSD картридер',
  },
];

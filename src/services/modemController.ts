import {
  ConnectionMode,
  ModemInfo,
  NETWORK_MODES,
  NetworkModeId,
  SmsMessage,
  U2DiagMode,
} from '../types/modem';
import {
  csqToDbm,
  csqToPercent,
  decodeGsm7PackedHex,
  decodeUcs2Hex,
  encodeGsm7PackedHex,
  encodeUcs2Hex,
  smartDecodeHuaweiPayload,
} from '../utils/ucs2';

// Типы Web Serial API (для Chrome/Edge на Windows)
interface SerialPortLike {
  open(options: { baudRate: number; dataBits?: number; stopBits?: number; parity?: string }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  getInfo?(): { usbVendorId?: number; usbProductId?: number };
}

interface NavigatorSerialLike {
  requestPort(options?: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }): Promise<SerialPortLike>;
}

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

export const INITIAL_MODEM_INFO: ModemInfo = {
  manufacturer: 'Huawei Technologies Co., Ltd.',
  model: 'E173',
  revision: '11.126.85.00.209',
  imei: '354291048271654',
  imsi: '250019843120455',
  simStatus: 'READY',
  operator: 'MTS-RUS',
  networkTech: 'HSDPA',
  networkMode: '3g_pref',
  csq: 21,
  rssiDbm: csqToDbm(21),
  signalPercent: csqToPercent(21),
  ber: 99,
  u2diag: 0,
  voiceEnabled: true,
  cardLockStatus: 'UNLOCKED',
  cardLockAttemptsLeft: 10,
  radioOn: true,
  portLabel: 'COM4 · HUAWEI 3G PC UI Interface',
  baudRate: 115200,
};

export const INITIAL_EMULATOR_SMS: SmsMessage[] = [
  {
    id: 1,
    folder: 'inbox',
    status: 'REC UNREAD',
    sender: 'MTS',
    timestamp: '26/11/20,10:12:44+12',
    text: 'Баланс: 482,50 руб. Пакет интернета: осталось 8,4 ГБ до 01.12.2026.',
    encoding: 'UCS2',
  },
  {
    id: 2,
    folder: 'inbox',
    status: 'REC READ',
    sender: '+79165550148',
    timestamp: '26/11/19,18:45:10+12',
    text: 'Датчик на объекте Северный-2 вышел на связь. Уровень сигнала -71 dBm.',
    encoding: 'UCS2',
  },
  {
    id: 3,
    folder: 'inbox',
    status: 'REC READ',
    sender: 'Telecom-Notify',
    timestamp: '26/11/18,09:05:22+12',
    text: 'SIM card registered on WCDMA 2100 MHz cell.',
    encoding: 'GSM7',
  },
];

export type LogCallback = (direction: 'TX' | 'RX' | 'SYS', payload: string) => void;

export class HuaweiModemController {
  private mode: ConnectionMode = 'emulator';
  private port: SerialPortLike | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private rxBuffer = '';
  private readLoopActive = false;
  private commandQueue: Promise<string> = Promise.resolve('');
  private onLog: LogCallback;

  // Внутреннее состояние эмулятора Huawei E173
  private emuState: ModemInfo = { ...INITIAL_MODEM_INFO };
  private emuSms: SmsMessage[] = INITIAL_EMULATOR_SMS.map((m) => ({ ...m }));
  private emuCharset: 'UCS2' | 'IRA' = 'UCS2';
  private nextSmsId = 4;

  constructor(onLog: LogCallback) {
    this.onLog = onLog;
  }

  public getMode(): ConnectionMode {
    return this.mode;
  }

  public getEmulatorState(): ModemInfo {
    return { ...this.emuState };
  }

  public getEmulatorSms(): SmsMessage[] {
    return this.emuSms.map((m) => ({ ...m }));
  }

  /**
   * Подключение к реальному USB-модему Huawei E173 через Web Serial API (Chrome/Edge).
   * Vendor ID Huawei: 0x12D1.
   */
  public async connectWebSerial(baudRate = 115200): Promise<ModemInfo> {
    if (!isWebSerialSupported()) {
      throw new Error('Web Serial API поддерживается только в Chrome или Edge на ПК.');
    }

    const serial = (navigator as unknown as { serial: NavigatorSerialLike }).serial;
    this.onLog('SYS', 'Открытие диалога выбора COM-порта (Huawei VID 0x12D1)...');

    // Показываем все порты с приоритетом Huawei, чтобы пользователь мог выбрать PC UI Interface
    const port = await serial.requestPort();
    await port.open({ baudRate, dataBits: 8, stopBits: 1, parity: 'none' });

    await this.disconnect();

    this.port = port;
    this.mode = 'webserial';
    this.rxBuffer = '';

    if (port.writable) {
      this.writer = port.writable.getWriter();
    }
    if (port.readable) {
      this.reader = port.readable.getReader();
      this.startReadLoop();
    }

    const info = port.getInfo?.();
    const vidPid =
      info?.usbVendorId && info?.usbProductId
        ? `USB ${info.usbVendorId.toString(16).toUpperCase().padStart(4, '0')}:${info.usbProductId
            .toString(16)
            .toUpperCase()
            .padStart(4, '0')}`
        : 'Web Serial COM';

    this.onLog('SYS', `Порт открыт (${vidPid}, ${baudRate} 8N1). Инициализация модема...`);

    const probed = await this.probeDeviceInfo(vidPid, baudRate);
    return probed;
  }

  public connectEmulator(): ModemInfo {
    void this.disconnect(false);
    this.mode = 'emulator';
    this.emuState = { ...INITIAL_MODEM_INFO };
    this.onLog('SYS', 'Запущен локальный эмулятор Huawei E173 (FW 11.126.85.00.209, COM4).');
    return { ...this.emuState };
  }

  public async disconnect(log = true): Promise<void> {
    this.readLoopActive = false;
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
      }
    } catch {
      // ignore close errors
    }
    try {
      if (this.writer) {
        this.writer.releaseLock();
      }
    } catch {
      // ignore
    }
    try {
      if (this.port) {
        await this.port.close();
      }
    } catch {
      // ignore
    }
    this.reader = null;
    this.writer = null;
    this.port = null;
    this.mode = 'disconnected';
    if (log) {
      this.onLog('SYS', 'Соединение с COM-портом закрыто.');
    }
  }

  private async startReadLoop(): Promise<void> {
    if (!this.reader) return;
    this.readLoopActive = true;
    const decoder = new TextDecoder();
    try {
      while (this.readLoopActive && this.reader) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          this.rxBuffer += decoder.decode(value, { stream: true });
        }
      }
    } catch (err) {
      if (this.readLoopActive) {
        this.onLog('SYS', `Ошибка чтения COM-порта: ${String(err)}`);
      }
    }
  }

  /**
   * Потокобезопасная отправка AT-команды (очередь, как в Flutter-сервисе).
   */
  public sendAtCommand(command: string, timeoutMs = 2500): Promise<string> {
    const task = this.commandQueue.then(() => this.executeCommand(command, timeoutMs));
    this.commandQueue = task.catch(() => '');
    return task;
  }

  private async executeCommand(command: string, timeoutMs: number): Promise<string> {
    const cleanCmd = command.trim();
    if (!cleanCmd) return '';

    if (this.mode === 'disconnected') {
      throw new Error('Модем не подключён. Выберите COM-порт или включите эмулятор.');
    }

    this.onLog('TX', cleanCmd);

    if (this.mode === 'emulator') {
      await new Promise((r) => setTimeout(r, 90 + Math.random() * 90));
      const response = this.handleEmulatorAt(cleanCmd);
      this.onLog('RX', response.trim());
      return response;
    }

    // Реальный Web Serial порт
    if (!this.writer) {
      throw new Error('COM-порт недоступен для записи.');
    }

    this.rxBuffer = '';
    const encoder = new TextEncoder();
    await this.writer.write(encoder.encode(`${cleanCmd}\r`));

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (
        this.rxBuffer.includes('\r\nOK\r\n') ||
        this.rxBuffer.includes('\r\nERROR\r\n') ||
        this.rxBuffer.includes('+CME ERROR:') ||
        this.rxBuffer.includes('+CMS ERROR:') ||
        (cleanCmd.startsWith('AT+CUSD=') && this.rxBuffer.includes('+CUSD:'))
      ) {
        await new Promise((r) => setTimeout(r, 80));
        break;
      }
      await new Promise((r) => setTimeout(r, 40));
    }

    const out = this.rxBuffer.trim();
    this.onLog('RX', out || '(таймаут ответа)');
    return out;
  }

  /**
   * Комплексный опрос параметров модема (ATI, CGSN, CIMI, CPIN, CSQ, COPS, SYSINFO, U2DIAG, CVOICE, CARDLOCK)
   */
  public async probeDeviceInfo(portLabel?: string, baudRate = 115200): Promise<ModemInfo> {
    if (this.mode === 'emulator') {
      // Небольшой реалистичный дрейф сигнала ±1 ASU
      if (this.emuState.radioOn) {
        const delta = Math.random() > 0.65 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        const nextCsq = Math.max(8, Math.min(29, this.emuState.csq + delta));
        this.emuState.csq = nextCsq;
        this.emuState.rssiDbm = csqToDbm(nextCsq);
        this.emuState.signalPercent = csqToPercent(nextCsq);
      } else {
        this.emuState.csq = 99;
        this.emuState.rssiDbm = -113;
        this.emuState.signalPercent = 0;
      }
      return { ...this.emuState };
    }

    await this.sendAtCommand('ATE0');
    const ati = await this.sendAtCommand('ATI');
    const imsiRes = await this.sendAtCommand('AT+CIMI');
    const pinRes = await this.sendAtCommand('AT+CPIN?');
    const csqRes = await this.sendAtCommand('AT+CSQ');
    const copsRes = await this.sendAtCommand('AT+COPS?');
    const sysinfoRes = await this.sendAtCommand('AT^SYSINFO');
    const u2diagRes = await this.sendAtCommand('AT^U2DIAG?');
    const cvoiceRes = await this.sendAtCommand('AT^CVOICE?');
    const lockRes = await this.sendAtCommand('AT^CARDLOCK?');

    const manufacturer = /Manufacturer:\s*(.+)/i.exec(ati)?.[1]?.trim() || 'Huawei';
    const model = /Model:\s*(.+)/i.exec(ati)?.[1]?.trim() || 'E173';
    const revision = /Revision:\s*(.+)/i.exec(ati)?.[1]?.trim() || 'Unknown';
    const imei = /IMEI:\s*(\d+)/i.exec(ati)?.[1]?.trim() || '—';
    const imsi = /(\d{14,16})/.exec(imsiRes)?.[1] || '—';

    let simStatus: ModemInfo['simStatus'] = 'READY';
    if (pinRes.includes('SIM PIN')) simStatus = 'SIM PIN';
    else if (pinRes.includes('SIM PUK')) simStatus = 'SIM PUK';
    else if (pinRes.includes('ERROR')) simStatus = 'NO SIM';

    const csqMatch = /\+CSQ:\s*(\d+),(\d+)/.exec(csqRes);
    const csq = csqMatch ? parseInt(csqMatch[1], 10) : 99;
    const ber = csqMatch ? parseInt(csqMatch[2], 10) : 99;

    const copsMatch = /\+COPS:\s*\d+,\d+,"([^"]+)"/.exec(copsRes);
    const operator = copsMatch ? copsMatch[1] : 'Поиск сети...';

    let networkTech: ModemInfo['networkTech'] = 'WCDMA';
    const sysMatch = /\^SYSINFO:\s*\d+,\d+,\d+,(\d+)/.exec(sysinfoRes);
    if (sysMatch) {
      const modeCode = parseInt(sysMatch[1], 10);
      if (modeCode === 0) networkTech = 'Нет сети';
      else if (modeCode === 3) networkTech = 'EDGE';
      else if (modeCode === 5) networkTech = 'WCDMA';
      else if (modeCode === 15) networkTech = 'HSDPA';
    }

    const u2Match = /(\d+)/.exec(u2diagRes);
    const u2Val = u2Match ? (parseInt(u2Match[1], 10) as U2DiagMode) : 0;
    const u2diag: U2DiagMode = [0, 255, 256, 257].includes(u2Val) ? u2Val : 0;

    const voiceEnabled = /\^CVOICE:\s*0/.test(cvoiceRes);
    const lockMatch = /\^CARDLOCK:\s*(\d+),(\d+)/.exec(lockRes);
    const cardLockStatus = lockMatch && lockMatch[1] === '1' ? 'LOCKED' : 'UNLOCKED';
    const cardLockAttemptsLeft = lockMatch ? parseInt(lockMatch[2], 10) : 10;

    return {
      manufacturer,
      model,
      revision,
      imei,
      imsi,
      simStatus,
      operator,
      networkTech,
      networkMode: 'auto',
      csq,
      rssiDbm: csqToDbm(csq),
      signalPercent: csqToPercent(csq),
      ber,
      u2diag,
      voiceEnabled,
      cardLockStatus,
      cardLockAttemptsLeft,
      radioOn: csq !== 99,
      portLabel: portLabel || 'Web Serial COM',
      baudRate,
    };
  }

  public async pollSignal(): Promise<{ csq: number; rssiDbm: number; signalPercent: number }> {
    const res = await this.sendAtCommand('AT+CSQ', 1200);
    const match = /\+CSQ:\s*(\d+),(\d+)/.exec(res);
    const csq = match ? parseInt(match[1], 10) : 99;
    return {
      csq,
      rssiDbm: csqToDbm(csq),
      signalPercent: csqToPercent(csq),
    };
  }

  public async fetchSmsList(): Promise<SmsMessage[]> {
    await this.sendAtCommand('AT+CMGF=1');
    await this.sendAtCommand('AT+CSCS="UCS2"');
    const raw = await this.sendAtCommand('AT+CMGL="ALL"', 4000);

    if (this.mode === 'emulator') {
      return this.emuSms.map((m) => ({ ...m }));
    }

    const messages: SmsMessage[] = [];
    const regex = /\+CMGL:\s*(\d+),"([^"]+)","([^"]*)",[^,]*,"([^"]*)"\r?\n([^\r\n]+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(raw)) !== null) {
      const id = parseInt(match[1], 10);
      const rawStatus = match[2];
      const rawSender = match[3];
      const timestamp = match[4];
      const body = match[5].trim();
      const decodedSender = smartDecodeHuaweiPayload(rawSender);
      const decodedBody = smartDecodeHuaweiPayload(body);

      messages.push({
        id,
        folder: rawStatus.includes('SENT') ? 'sent' : 'inbox',
        status: rawStatus.includes('UNREAD')
          ? 'REC UNREAD'
          : rawStatus.includes('SENT')
            ? 'STO SENT'
            : 'REC READ',
        sender: decodedSender || rawSender,
        timestamp,
        text: decodedBody || body,
        encoding: /^[0-9A-Fa-f]+$/.test(body) ? 'UCS2' : 'GSM7',
      });
    }
    return messages;
  }

  public async sendSms(recipient: string, text: string): Promise<SmsMessage> {
    const cleanPhone = recipient.trim();
    const ucs2Phone = encodeUcs2Hex(cleanPhone);
    const ucs2Body = encodeUcs2Hex(text);

    await this.sendAtCommand('AT+CMGF=1');
    await this.sendAtCommand('AT+CSCS="UCS2"');
    await this.sendAtCommand('AT+CSMP=17,167,0,8');

    if (this.mode === 'emulator') {
      await this.sendAtCommand(`AT+CMGS="${ucs2Phone}"`);
      this.onLog('TX', `${ucs2Body}<Ctrl+Z>`);
      await new Promise((r) => setTimeout(r, 320));
      const newMsg: SmsMessage = {
        id: this.nextSmsId++,
        folder: 'sent',
        status: 'STO SENT',
        sender: cleanPhone,
        timestamp: new Date().toLocaleTimeString('ru-RU'),
        text,
        encoding: 'UCS2',
      };
      this.emuSms = [newMsg, ...this.emuSms];
      this.onLog('RX', `+CMGS: ${newMsg.id}\r\nOK`);
      return newMsg;
    }

    // Web Serial реальная отправка
    if (!this.writer) throw new Error('COM-порт недоступен');
    const encoder = new TextEncoder();
    this.rxBuffer = '';
    this.onLog('TX', `AT+CMGS="${ucs2Phone}"`);
    await this.writer.write(encoder.encode(`AT+CMGS="${ucs2Phone}"\r`));
    await new Promise((r) => setTimeout(r, 250));
    this.onLog('TX', `${ucs2Body}<Ctrl+Z>`);
    await this.writer.write(encoder.encode(`${ucs2Body}\x1A`));
    await new Promise((r) => setTimeout(r, 2000));
    this.onLog('RX', this.rxBuffer.trim() || 'OK');

    return {
      id: Date.now(),
      folder: 'sent',
      status: 'STO SENT',
      sender: cleanPhone,
      timestamp: new Date().toLocaleTimeString('ru-RU'),
      text,
      encoding: 'UCS2',
    };
  }

  public async deleteSms(id: number): Promise<void> {
    await this.sendAtCommand(`AT+CMGD=${id}`);
    if (this.mode === 'emulator') {
      this.emuSms = this.emuSms.filter((m) => m.id !== id);
    }
  }

  public async sendUssd(code: string): Promise<{
    rawRequest: string;
    rawResponse: string;
    decodedResponse: string;
    status: 'ok' | 'error';
  }> {
    const trimmed = code.trim();
    const packed = encodeGsm7PackedHex(trimmed);
    const cmd = `AT+CUSD=1,"${packed}",15`;
    const response = await this.sendAtCommand(cmd, 6500);

    const match = /\+CUSD:\s*\d+,"([^"]+)"(?:,(\d+))?/.exec(response);
    if (match) {
      const payload = match[1];
      const dcs = match[2] ? parseInt(match[2], 10) : 72;
      const decoded = smartDecodeHuaweiPayload(payload, dcs);
      return {
        rawRequest: cmd,
        rawResponse: response.trim(),
        decodedResponse: decoded,
        status: 'ok',
      };
    }

    return {
      rawRequest: cmd,
      rawResponse: response.trim() || 'Нет ответа от сети',
      decodedResponse: response.includes('ERROR')
        ? 'Оператор отклонил USSD-запрос или команда не поддерживается.'
        : response.trim() || 'Таймаут ожидания ответа +CUSD.',
      status: response.includes('ERROR') ? 'error' : 'ok',
    };
  }

  public async setNetworkMode(modeId: NetworkModeId): Promise<void> {
    const found = NETWORK_MODES.find((m) => m.id === modeId);
    if (!found) return;
    await this.sendAtCommand(found.atCommand);
    if (this.mode === 'emulator') {
      this.emuState.networkMode = modeId;
      if (modeId === '2g_only') this.emuState.networkTech = 'EDGE';
      else if (modeId === '3g_only' || modeId === '3g_pref') this.emuState.networkTech = 'HSDPA';
      else this.emuState.networkTech = 'WCDMA';
    }
  }

  public async setU2Diag(mode: U2DiagMode): Promise<void> {
    await this.sendAtCommand(`AT^U2DIAG=${mode}`);
    if (this.mode === 'emulator') {
      this.emuState.u2diag = mode;
    }
  }

  public async setVoiceEnabled(enabled: boolean): Promise<void> {
    // На Huawei E173: AT^CVOICE=0 включает голос, AT^CVOICE=1 отключает
    await this.sendAtCommand(enabled ? 'AT^CVOICE=0' : 'AT^CVOICE=1');
    if (this.mode === 'emulator') {
      this.emuState.voiceEnabled = enabled;
    }
  }

  public async toggleRadio(on: boolean): Promise<void> {
    await this.sendAtCommand(on ? 'AT+CFUN=1' : 'AT+CFUN=0');
    if (this.mode === 'emulator') {
      this.emuState.radioOn = on;
      this.emuState.networkTech = on ? 'HSDPA' : 'Нет сети';
      this.emuState.csq = on ? 21 : 99;
      this.emuState.rssiDbm = csqToDbm(this.emuState.csq);
      this.emuState.signalPercent = csqToPercent(this.emuState.csq);
    }
  }

  public async rebootModem(): Promise<void> {
    await this.sendAtCommand('AT+CFUN=1,1');
  }

  public async unlockCard(nckCode: string): Promise<string> {
    const clean = nckCode.replace(/\D/g, '');
    return this.sendAtCommand(`AT^CARDLOCK="${clean}"`);
  }

  // ===== Встроенный эмулятор Huawei E173 =====
  private handleEmulatorAt(rawCmd: string): string {
    const cmd = rawCmd.toUpperCase();

    if (cmd === 'AT' || cmd === 'ATE0' || cmd === 'ATE1' || cmd === 'AT+CMGF=1' || cmd.startsWith('AT+CSMP=')) {
      return '\r\nOK\r\n';
    }

    if (cmd.startsWith('AT+CSCS=')) {
      this.emuCharset = cmd.includes('UCS2') ? 'UCS2' : 'IRA';
      return '\r\nOK\r\n';
    }

    if (cmd === 'ATI') {
      return [
        `Manufacturer: ${this.emuState.manufacturer}`,
        `Model: ${this.emuState.model}`,
        `Revision: ${this.emuState.revision}`,
        `IMEI: ${this.emuState.imei}`,
        '+GCAP: +CGSM,+DS,+ES',
        '',
        'OK',
      ].join('\r\n');
    }

    if (cmd === 'AT+CGSN') {
      return `${this.emuState.imei}\r\n\r\nOK\r\n`;
    }

    if (cmd === 'AT+CIMI') {
      return `${this.emuState.imsi}\r\n\r\nOK\r\n`;
    }

    if (cmd === 'AT+CPIN?') {
      return `+CPIN: ${this.emuState.simStatus}\r\n\r\nOK\r\n`;
    }

    if (cmd === 'AT+CSQ') {
      if (!this.emuState.radioOn) {
        return '+CSQ: 99,99\r\n\r\nOK\r\n';
      }
      const delta = Math.random() > 0.6 ? (Math.random() > 0.5 ? 1 : -1) : 0;
      this.emuState.csq = Math.max(9, Math.min(28, this.emuState.csq + delta));
      this.emuState.rssiDbm = csqToDbm(this.emuState.csq);
      this.emuState.signalPercent = csqToPercent(this.emuState.csq);
      return `+CSQ: ${this.emuState.csq},99\r\n\r\nOK\r\n`;
    }

    if (cmd === 'AT+COPS?') {
      const act = this.emuState.networkTech === 'EDGE' || this.emuState.networkTech === 'GPRS' ? 0 : 2;
      return `+COPS: 0,0,"${this.emuState.operator}",${act}\r\n\r\nOK\r\n`;
    }

    if (cmd === 'AT^SYSINFO') {
      const modeCode = !this.emuState.radioOn
        ? 0
        : this.emuState.networkTech === 'EDGE'
          ? 3
          : this.emuState.networkTech === 'HSDPA'
            ? 15
            : 5;
      return `^SYSINFO:2,3,0,${modeCode},1,,4\r\n\r\nOK\r\n`;
    }

    if (cmd === 'AT^SYSCFG?') {
      return '^SYSCFG:2,2,3FFFFFFF,1,2\r\n\r\nOK\r\n';
    }

    if (cmd.startsWith('AT^SYSCFG=')) {
      return '\r\nOK\r\n';
    }

    if (cmd === 'AT^U2DIAG?') {
      return `${this.emuState.u2diag}\r\n\r\nOK\r\n`;
    }

    if (cmd.startsWith('AT^U2DIAG=')) {
      const val = parseInt(cmd.split('=')[1], 10) as U2DiagMode;
      if ([0, 255, 256, 257].includes(val)) {
        this.emuState.u2diag = val;
        return '\r\nOK\r\n';
      }
      return '\r\nERROR\r\n';
    }

    if (cmd === 'AT^CVOICE?') {
      return `^CVOICE:${this.emuState.voiceEnabled ? '0,8000,16,20' : '1'}\r\n\r\nOK\r\n`;
    }

    if (cmd === 'AT^CVOICE=0') {
      this.emuState.voiceEnabled = true;
      return '\r\nOK\r\n';
    }

    if (cmd === 'AT^CVOICE=1') {
      this.emuState.voiceEnabled = false;
      return '\r\nOK\r\n';
    }

    if (cmd === 'AT^CARDLOCK?') {
      return `^CARDLOCK: ${this.emuState.cardLockStatus === 'UNLOCKED' ? 2 : 1},${this.emuState.cardLockAttemptsLeft},0\r\n\r\nOK\r\n`;
    }

    if (cmd.startsWith('AT^CARDLOCK=')) {
      this.emuState.cardLockStatus = 'UNLOCKED';
      return '\r\nOK\r\n';
    }

    if (cmd === 'AT+CFUN=0') {
      this.emuState.radioOn = false;
      this.emuState.networkTech = 'Нет сети';
      return '\r\nOK\r\n';
    }

    if (cmd === 'AT+CFUN=1' || cmd === 'AT+CFUN=1,1') {
      this.emuState.radioOn = true;
      this.emuState.networkTech = 'HSDPA';
      return '\r\nOK\r\n';
    }

    if (cmd.startsWith('AT+CMGL=')) {
      const lines = this.emuSms.map((m) => {
        const sender = this.emuCharset === 'UCS2' ? encodeUcs2Hex(m.sender) : m.sender;
        const body = this.emuCharset === 'UCS2' ? encodeUcs2Hex(m.text) : m.text;
        return `+CMGL: ${m.id},"${m.status}","${sender}",,"${m.timestamp}"\r\n${body}`;
      });
      return `${lines.join('\r\n')}\r\n\r\nOK\r\n`;
    }

    if (cmd.startsWith('AT+CMGD=')) {
      return '\r\nOK\r\n';
    }

    if (cmd.startsWith('AT+CMGS=')) {
      return '> ';
    }

    if (cmd.startsWith('AT+CUSD=')) {
      const quoted = /"([^"]+)"/.exec(rawCmd)?.[1] || '';
      const decodedCode = /^[0-9A-Fa-f]+$/.test(quoted)
        ? decodeGsm7PackedHex(quoted)
        : quoted;

      let replyText = `Ответ оператора на запрос ${decodedCode}: Услуга активна.`;
      if (decodedCode === '*100#' || decodedCode === '*102#') {
        replyText = 'Баланс: 482,50 руб. Тариф: Для устройств 3G. Остаток трафика: 8,4 ГБ.';
      } else if (decodedCode === '*105#' || decodedCode === '*111#') {
        replyText = 'Меню управления: 1. Баланс 2. Тариф 3. Интернет-пакеты 4. Услуги.';
      } else if (decodedCode === '*111*0887#' || decodedCode === '*205#') {
        replyText = 'Ваш номер телефона: +7 (916) 402-18-93';
      } else if (decodedCode === '*100*1#') {
        replyText = 'Остаток пакетов: Интернет 8412 МБ, SMS 95 шт. Действует до 01.12.2026.';
      }

      const hexReply = encodeUcs2Hex(replyText);
      return `OK\r\n\r\n+CUSD: 0,"${hexReply}",72\r\n`;
    }

    // Если пользователь отправил hex UCS2 вручную
    if (cmd.startsWith('DECODE:')) {
      return decodeUcs2Hex(rawCmd.slice(7).trim());
    }

    return '\r\nOK\r\n';
  }
}

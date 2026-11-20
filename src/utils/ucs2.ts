/**
 * Кодировщик/декодировщик UCS2 и GSM 7-bit для модема Huawei E173.
 * Используется для корректного чтения и отправки кириллических SMS и USSD.
 */

export function encodeUcs2Hex(text: string): string {
  let hex = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    hex += code.toString(16).toUpperCase().padStart(4, '0');
  }
  return hex;
}

export function decodeUcs2Hex(hex: string): string {
  const clean = hex.replace(/[^0-9A-Fa-f]/g, '');
  if (clean.length === 0 || clean.length % 4 !== 0) {
    return hex;
  }
  let out = '';
  for (let i = 0; i < clean.length; i += 4) {
    const code = parseInt(clean.slice(i, i + 4), 16);
    if (!Number.isNaN(code)) {
      out += String.fromCharCode(code);
    }
  }
  return out;
}

/**
 * Упаковка 7-битного GSM для USSD-запросов Huawei E173 (например *100# -> AA180C3602).
 */
export function encodeGsm7PackedHex(ascii: string): string {
  const bytes: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;

  for (let i = 0; i < ascii.length; i++) {
    const septet = ascii.charCodeAt(i) & 0x7f;
    bitBuffer |= septet << bitCount;
    bitCount += 7;
    while (bitCount >= 8) {
      bytes.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  }

  if (bitCount > 0) {
    bytes.push(bitBuffer & 0xff);
  }

  return bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join('');
}

export function decodeGsm7PackedHex(hex: string): string {
  const clean = hex.replace(/[^0-9A-Fa-f]/g, '');
  if (clean.length === 0 || clean.length % 2 !== 0) return hex;

  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.slice(i, i + 2), 16));
  }

  let out = '';
  let bitBuffer = 0;
  let bitCount = 0;

  for (const byte of bytes) {
    bitBuffer |= byte << bitCount;
    bitCount += 8;
    while (bitCount >= 7) {
      const septet = bitBuffer & 0x7f;
      if (septet !== 0 || out.length > 0) {
        out += String.fromCharCode(septet);
      }
      bitBuffer >>= 7;
      bitCount -= 7;
    }
  }

  return out.replace(/\0+$/g, '');
}

export function isLikelyHex(str: string): boolean {
  return /^[0-9A-Fa-f]+$/.test(str) && str.length >= 4 && str.length % 2 === 0;
}

export function smartDecodeHuaweiPayload(raw: string, dcs?: number): string {
  const trimmed = raw.trim().replace(/^"|"$/g, '');
  if (!trimmed) return '';

  // DCS 72 (0x48) или 8 (0x08) — UCS2
  if (dcs === 72 || dcs === 8) {
    return decodeUcs2Hex(trimmed);
  }

  // Автоопределение UCS2 (кириллица начинается с 04xx, латиница с 00xx)
  if (isLikelyHex(trimmed) && trimmed.length % 4 === 0) {
    const looksUcs2 = /(04[0-4][0-9A-Fa-f]|00[2-7][0-9A-Fa-f])/.test(trimmed);
    if (looksUcs2) {
      return decodeUcs2Hex(trimmed);
    }
  }

  // Если GSM 7-bit packed hex (например dcs 15)
  if (dcs === 15 && isLikelyHex(trimmed)) {
    const decoded = decodeGsm7PackedHex(trimmed);
    if (/^[\x20-\x7E\r\n]+$/.test(decoded)) {
      return decoded;
    }
  }

  return trimmed;
}

export function needsUcs2(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) {
      return true;
    }
  }
  return false;
}

export function csqToDbm(csq: number): number {
  if (csq === 99 || csq < 0 || csq > 31) return -113;
  return -113 + csq * 2;
}

export function csqToPercent(csq: number): number {
  if (csq === 99 || csq <= 0) return 0;
  return Math.min(100, Math.round((csq / 31) * 100));
}

export function getSignalQualityLabel(dbm: number): {
  label: string;
  tone: 'good' | 'fair' | 'poor';
} {
  if (dbm >= -75) return { label: 'Отличный', tone: 'good' };
  if (dbm >= -89) return { label: 'Хороший', tone: 'good' };
  if (dbm >= -100) return { label: 'Средний', tone: 'fair' };
  return { label: 'Слабый', tone: 'poor' };
}

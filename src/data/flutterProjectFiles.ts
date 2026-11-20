export interface FlutterProjectFile {
  path: string;
  language: 'yaml' | 'dart' | 'batch' | 'markdown' | 'cpp';
  summary: string;
  content: string;
}

export const FLUTTER_PROJECT_FILES: FlutterProjectFile[] = [
  {
    path: 'pubspec.yaml',
    language: 'yaml',
    summary: 'Зависимости Flutter для Windows (Win32 COM-порт, Provider, управление окном)',
    content: `name: huawei_e173_manager
description: Портативная программа для Windows для управления 3G-модемом Huawei E173.
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.4.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  serial_port_win32: ^2.2.1
  provider: ^6.1.2
  window_manager: ^0.4.3
  path: ^1.9.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0

flutter:
  uses-material-design: true
`,
  },
  {
    path: 'build_portable.bat',
    language: 'batch',
    summary: 'Скрипт сборки портативной версии в папку dist\\HuaweiE173_Portable и ZIP-архив',
    content: `@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================================
echo  Huawei E173 Manager — Сборка портативной версии Windows
echo ========================================================
echo.

where flutter >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ОШИБКА] Flutter SDK не найден в PATH.
    echo Установите Flutter для Windows: https://docs.flutter.dev/get-started/install/windows
    pause
    exit /b 1
)

if not exist "windows\\CMakeLists.txt" (
    echo [1/4] Инициализация стандартного Windows Runner...
    call flutter create --platforms=windows .
)

echo [2/4] Загрузка зависимостей Dart...
call flutter pub get
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

echo [3/4] Компиляция Windows x64 Release...
call flutter build windows --release
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

set "RELEASE_DIR=build\\windows\\x64\\runner\\Release"
set "DIST_DIR=dist\\HuaweiE173_Portable"

if not exist "%RELEASE_DIR%" (
    set "RELEASE_DIR=build\\windows\\runner\\Release"
)

echo [4/4] Формирование портативного каталога %DIST_DIR%...
if exist "%DIST_DIR%" rmdir /s /q "%DIST_DIR%"
mkdir "%DIST_DIR%"
xcopy "%RELEASE_DIR%\\*" "%DIST_DIR%\\" /E /I /Y >nul

:: Флаг портативного режима (настройки и логи хранятся рядом с .exe)
echo portable=true> "%DIST_DIR%\\portable.flag"

:: Упаковка в готовый ZIP-архив через встроенный PowerShell
powershell -NoProfile -Command "Compress-Archive -Path '%DIST_DIR%\\*' -DestinationPath 'dist\\HuaweiE173_Portable_Win64.zip' -Force"

echo.
echo Готово! Портативная папка: %DIST_DIR%
echo Архив для флешки: dist\\HuaweiE173_Portable_Win64.zip
echo Примечание: на чистой Windows без Visual C++ Redistributable скопируйте
echo vcruntime140.dll, vcruntime140_1.dll и msvcp140.dll в папку %DIST_DIR%.
echo.
pause
`,
  },
  {
    path: 'README.md',
    language: 'markdown',
    summary: 'Инструкция по сборке, драйверам Huawei E173 и запуску с флешки',
    content: `# Huawei E173 Manager (Portable Windows · Flutter)

Портативная настольная программа для Windows 10/11 (x64) на Flutter для работы с 3G USB-модемом **Huawei E173** через COM-порт (\`HUAWEI Mobile Connect - 3G PC UI Interface\`).

## Возможности
- **Автопоиск COM-порта Huawei** через Win32 API (\`serial_port_win32\`, без внешних драйверов C++).
- **Мониторинг сигнала и сети**: RSSI (dBm / ASU), стандарт сети (HSDPA / WCDMA / EDGE), оператор, IMEI, IMSI, версия прошивки.
- **SMS с полной поддержкой кириллицы (UCS2)**: чтение входящих, отправка, удаление, локальный архив рядом с \`.exe\`.
- **USSD-запросы**: автоматическая упаковка GSM 7-bit и декодирование кириллических ответов UCS2 (\`+CUSD\`).
- **Инженерные настройки E173**:
  - Переключение режима сети (\`AT^SYSCFG\`: Авто / Только 3G / Приоритет 3G / Только 2G).
  - Режим USB-композиции (\`AT^U2DIAG\`: 0 — только модем, 255 / 256 / 257).
  - Голосовые функции (\`AT^CVOICE=0/1\`), проверка блокировки (\`AT^CARDLOCK?\`), перезагрузка (\`AT+CFUN=1,1\`).
- **AT-терминал**: ручной ввод любых AT-команд с журналом TX/RX.
- **100% портативность**: конфигурация \`settings.json\` и кэш SMS сохраняются в той же папке, где лежит \`huawei_e173_manager.exe\`.

## Требования для сборки
1. Windows 10/11 x64
2. Flutter SDK 3.22+ (\`flutter config --enable-windows-desktop\`)
3. Visual Studio 2022 с компонентом **«Разработка классических приложений на C++»**

## Быстрая сборка портативной версии
Запустите \`build_portable.bat\` двойным кликом (или в PowerShell):
\`\`\`bat
build_portable.bat
\`\`\`
Скрипт соберёт релиз и создаст готовую переносимую папку \`dist\\HuaweiE173_Portable\\\` и архив \`dist\\HuaweiE173_Portable_Win64.zip\`.

## Какой COM-порт выбирать для Huawei E173?
В «Диспетчере устройств» Windows модем Huawei E173 обычно создаёт два порта:
- \`HUAWEI Mobile Connect - 3G Modem\` — используется для RAS/PPP-дозвона.
- \`HUAWEI Mobile Connect - 3G PC UI Interface\` — **выбирайте этот порт** для опроса сигнала, SMS, USSD и AT-команд (работает даже во время активного интернет-соединения).
`,
  },
  {
    path: 'lib/main.dart',
    language: 'dart',
    summary: 'Точка входа Flutter Desktop, настройка окна и навигация NavigationRail',
    content: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:window_manager/window_manager.dart';

import 'screens/dashboard_screen.dart';
import 'screens/engineering_screen.dart';
import 'screens/sms_screen.dart';
import 'screens/terminal_screen.dart';
import 'screens/ussd_screen.dart';
import 'services/huawei_modem_service.dart';
import 'services/portable_storage.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Настройка параметров окна для Windows Desktop
  await windowManager.ensureInitialized();
  const windowOptions = WindowOptions(
    size: Size(1160, 760),
    minimumSize: Size(920, 620),
    center: true,
    title: 'Huawei E173 Manager (Portable)',
  );

  await windowManager.waitUntilReadyToShow(windowOptions, () async {
    await windowManager.show();
    await windowManager.focus();
  });

  final storage = PortableStorage();
  await storage.init();

  runApp(
    ChangeNotifierProvider(
      create: (_) => HuaweiModemService(storage)..refreshPorts(),
      child: const HuaweiE173App(),
    ),
  );
}

class HuaweiE173App extends StatelessWidget {
  const HuaweiE173App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Huawei E173 Manager',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1D4ED8),
          surface: const Color(0xFFF8FAFC),
        ),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        cardTheme: CardThemeData(
          elevation: 0,
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
        ),
      ),
      home: const MainWorkspaceShell(),
    );
  }
}

class MainWorkspaceShell extends StatefulWidget {
  const MainWorkspaceShell({super.key});

  @override
  State<MainWorkspaceShell> createState() => _MainWorkspaceShellState();
}

class _MainWorkspaceShellState extends State<MainWorkspaceShell> {
  int _selectedIndex = 0;

  static const _screens = <Widget>[
    DashboardScreen(),
    SmsScreen(),
    UssdScreen(),
    EngineeringScreen(),
    TerminalScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final modem = context.watch<HuaweiModemService>();

    return Scaffold(
      body: Row(
        children: [
          NavigationRail(
            extended: true,
            minExtendedWidth: 224,
            backgroundColor: Colors.white,
            selectedIndex: _selectedIndex,
            onDestinationSelected: (idx) => setState(() => _selectedIndex = idx),
            leading: Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Huawei E173',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    modem.isConnected
                        ? 'Подключён · \${modem.activePortName}'
                        : 'Порт не открыт',
                    style: TextStyle(
                      fontSize: 12,
                      color: modem.isConnected
                          ? const Color(0xFF16A34A)
                          : const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
            destinations: const [
              NavigationRailDestination(
                icon: Icon(Icons.signal_cellular_alt_outlined),
                selectedIcon: Icon(Icons.signal_cellular_alt),
                label: Text('Обзор и сигнал'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.sms_outlined),
                selectedIcon: Icon(Icons.sms),
                label: Text('SMS-сообщения'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.dialpad_outlined),
                selectedIcon: Icon(Icons.dialpad),
                label: Text('USSD-запросы'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.tune_outlined),
                selectedIcon: Icon(Icons.tune),
                label: Text('Настройки E173'),
              ),
              NavigationRailDestination(
                icon: Icon(Icons.terminal_outlined),
                selectedIcon: Icon(Icons.terminal),
                label: Text('AT-терминал'),
              ),
            ],
          ),
          const VerticalDivider(width: 1, color: Color(0xFFE2E8F0)),
          Expanded(
            child: IndexedStack(
              index: _selectedIndex,
              children: _screens,
            ),
          ),
        ],
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/models/modem_models.dart',
    language: 'dart',
    summary: 'Модели данных: состояние модема, COM-порт, SMS, USSD, AT-лог',
    content: `class ComPortOption {
  final String portName;
  final String friendlyName;
  final bool isHuaweiPcUi;

  const ComPortOption({
    required this.portName,
    required this.friendlyName,
    required this.isHuaweiPcUi,
  });
}

class ModemSnapshot {
  final String manufacturer;
  final String model;
  final String revision;
  final String imei;
  final String imsi;
  final String simStatus;
  final String operatorName;
  final String networkTech;
  final int csq;
  final int rssiDbm;
  final int signalPercent;
  final int u2diag;
  final bool voiceEnabled;
  final String cardLockStatus;
  final int cardLockAttempts;

  const ModemSnapshot({
    this.manufacturer = '—',
    this.model = 'E173',
    this.revision = '—',
    this.imei = '—',
    this.imsi = '—',
    this.simStatus = 'Неизвестно',
    this.operatorName = '—',
    this.networkTech = 'Нет сети',
    this.csq = 99,
    this.rssiDbm = -113,
    this.signalPercent = 0,
    this.u2diag = 0,
    this.voiceEnabled = false,
    this.cardLockStatus = '—',
    this.cardLockAttempts = 10,
  });

  ModemSnapshot copyWith({
    String? manufacturer,
    String? model,
    String? revision,
    String? imei,
    String? imsi,
    String? simStatus,
    String? operatorName,
    String? networkTech,
    int? csq,
    int? rssiDbm,
    int? signalPercent,
    int? u2diag,
    bool? voiceEnabled,
    String? cardLockStatus,
    int? cardLockAttempts,
  }) {
    return ModemSnapshot(
      manufacturer: manufacturer ?? this.manufacturer,
      model: model ?? this.model,
      revision: revision ?? this.revision,
      imei: imei ?? this.imei,
      imsi: imsi ?? this.imsi,
      simStatus: simStatus ?? this.simStatus,
      operatorName: operatorName ?? this.operatorName,
      networkTech: networkTech ?? this.networkTech,
      csq: csq ?? this.csq,
      rssiDbm: rssiDbm ?? this.rssiDbm,
      signalPercent: signalPercent ?? this.signalPercent,
      u2diag: u2diag ?? this.u2diag,
      voiceEnabled: voiceEnabled ?? this.voiceEnabled,
      cardLockStatus: cardLockStatus ?? this.cardLockStatus,
      cardLockAttempts: cardLockAttempts ?? this.cardLockAttempts,
    );
  }
}

class SmsRecord {
  final int index;
  final String status;
  final String sender;
  final String timestamp;
  final String body;

  const SmsRecord({
    required this.index,
    required this.status,
    required this.sender,
    required this.timestamp,
    required this.body,
  });
}

class UssdRecord {
  final DateTime createdAt;
  final String code;
  final String response;
  final String rawLine;

  const UssdRecord({
    required this.createdAt,
    required this.code,
    required this.response,
    required this.rawLine,
  });
}

class AtLogRecord {
  final DateTime time;
  final String direction; // TX, RX, SYS
  final String text;

  const AtLogRecord({
    required this.time,
    required this.direction,
    required this.text,
  });
}
`,
  },
  {
    path: 'lib/services/ucs2_codec.dart',
    language: 'dart',
    summary: 'Кодировщик и декодировщик UCS2 и 7-битного GSM для кириллицы Huawei E173',
    content: `/// Кодек UCS2 и 7-bit GSM для SMS и USSD модема Huawei E173.
class Ucs2Codec {
  static String encodeUcs2Hex(String text) {
    final buffer = StringBuffer();
    for (final unit in text.codeUnits) {
      buffer.write(unit.toRadixString(16).toUpperCase().padLeft(4, '0'));
    }
    return buffer.toString();
  }

  static String decodeUcs2Hex(String hex) {
    final clean = hex.replaceAll(RegExp(r'[^0-9A-Fa-f]'), '');
    if (clean.isEmpty || clean.length % 4 != 0) return hex;
    final units = <int>[];
    for (var i = 0; i < clean.length; i += 4) {
      final code = int.tryParse(clean.substring(i, i + 4), radix: 16);
      if (code != null) units.add(code);
    }
    return String.fromCharCodes(units);
  }

  /// Упаковка 7-bit GSM для USSD Huawei E173 (*100# -> AA180C3602)
  static String encodeGsm7PackedHex(String ascii) {
    final bytes = <int>[];
    var bitBuffer = 0;
    var bitCount = 0;

    for (final unit in ascii.codeUnits) {
      final septet = unit & 0x7F;
      bitBuffer |= septet << bitCount;
      bitCount += 7;
      while (bitCount >= 8) {
        bytes.add(bitBuffer & 0xFF);
        bitBuffer >>= 8;
        bitCount -= 8;
      }
    }
    if (bitCount > 0) {
      bytes.add(bitBuffer & 0xFF);
    }

    return bytes
        .map((b) => b.toRadixString(16).toUpperCase().padLeft(2, '0'))
        .join();
  }

  static String decodeGsm7PackedHex(String hex) {
    final clean = hex.replaceAll(RegExp(r'[^0-9A-Fa-f]'), '');
    if (clean.isEmpty || clean.length % 2 != 0) return hex;

    final bytes = <int>[];
    for (var i = 0; i < clean.length; i += 2) {
      bytes.add(int.parse(clean.substring(i, i + 2), radix: 16));
    }

    final buffer = StringBuffer();
    var bitBuffer = 0;
    var bitCount = 0;

    for (final byte in bytes) {
      bitBuffer |= byte << bitCount;
      bitCount += 8;
      while (bitCount >= 7) {
        final septet = bitBuffer & 0x7F;
        if (septet != 0 || buffer.isNotEmpty) {
          buffer.writeCharCode(septet);
        }
        bitBuffer >>= 7;
        bitCount -= 7;
      }
    }
    return buffer.toString().replaceAll(RegExp(r'\\x00+\$'), '');
  }

  static String smartDecode(String raw, {int? dcs}) {
    final trimmed = raw.trim().replaceAll(RegExp(r'^"|"\$'), '');
    if (trimmed.isEmpty) return '';

    if (dcs == 72 || dcs == 8) {
      return decodeUcs2Hex(trimmed);
    }

    final isHex = RegExp(r'^[0-9A-Fa-f]+\$').hasMatch(trimmed);
    if (isHex && trimmed.length % 4 == 0) {
      if (RegExp(r'(04[0-4][0-9A-Fa-f]|00[2-7][0-9A-Fa-f])').hasMatch(trimmed)) {
        return decodeUcs2Hex(trimmed);
      }
    }

    if (dcs == 15 && isHex) {
      return decodeGsm7PackedHex(trimmed);
    }

    return trimmed;
  }

  static int csqToDbm(int csq) => (csq < 0 || csq > 31) ? -113 : -113 + csq * 2;

  static int csqToPercent(int csq) =>
      (csq <= 0 || csq > 31) ? 0 : ((csq / 31) * 100).round().clamp(0, 100);
}
`,
  },
  {
    path: 'lib/services/portable_storage.dart',
    language: 'dart',
    summary: 'Хранение настроек settings.json рядом с .exe (без записи в AppData и реестр)',
    content: `import 'dart:convert';
import 'dart:io';
import 'package:path/path.dart' as p;

/// Портативное хранилище: все файлы сохраняются рядом с исполняемым .exe.
class PortableStorage {
  late final String baseDir;
  late final File _settingsFile;

  String lastPort = '';
  int baudRate = 115200;
  int pollIntervalSec = 3;

  Future<void> init() async {
    // Директория, в которой лежит huawei_e173_manager.exe
    baseDir = File(Platform.resolvedExecutable).parent.path;
    _settingsFile = File(p.join(baseDir, 'settings.json'));

    if (await _settingsFile.exists()) {
      try {
        final raw = await _settingsFile.readAsString();
        final json = jsonDecode(raw) as Map<String, dynamic>;
        lastPort = (json['lastPort'] as String?) ?? '';
        baudRate = (json['baudRate'] as int?) ?? 115200;
        pollIntervalSec = (json['pollIntervalSec'] as int?) ?? 3;
      } catch (_) {
        // Если файл повреждён, используем значения по умолчанию
      }
    } else {
      await save();
    }
  }

  Future<void> save() async {
    final payload = const JsonEncoder.withIndent('  ').convert({
      'portable': true,
      'lastPort': lastPort,
      'baudRate': baudRate,
      'pollIntervalSec': pollIntervalSec,
    });
    await _settingsFile.writeAsString(payload);
  }
}
`,
  },
  {
    path: 'lib/services/huawei_modem_service.dart',
    language: 'dart',
    summary: 'Ядро работы с COM-портом Win32, очередь AT-команд, SMS, USSD, AT^SYSCFG и AT^U2DIAG',
    content: `import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:serial_port_win32/serial_port_win32.dart';

import '../models/modem_models.dart';
import 'portable_storage.dart';
import 'ucs2_codec.dart';

class HuaweiModemService extends ChangeNotifier {
  final PortableStorage storage;

  SerialPort? _port;
  Timer? _pollTimer;
  Future<void> _queue = Future.value();

  List<ComPortOption> availablePorts = [];
  String? activePortName;
  bool isConnected = false;
  bool isBusy = false;

  ModemSnapshot snapshot = const ModemSnapshot();
  List<int> rssiHistory = [];
  List<SmsRecord> smsList = [];
  List<UssdRecord> ussdHistory = [];
  List<AtLogRecord> logs = [];

  HuaweiModemService(this.storage);

  void _appendLog(String direction, String text) {
    logs.insert(
      0,
      AtLogRecord(time: DateTime.now(), direction: direction, text: text.trim()),
    );
    if (logs.length > 300) {
      logs.removeRange(300, logs.length);
    }
    notifyListeners();
  }

  /// Поиск всех COM-портов Windows с выделением HUAWEI 3G PC UI Interface
  void refreshPorts() {
    final infos = SerialPort.getPortsWithFullMessages();
    availablePorts = infos.map((info) {
      final friendly = info.friendlyName;
      final isPcUi = friendly.toUpperCase().contains('HUAWEI') &&
          friendly.toUpperCase().contains('PC UI');
      return ComPortOption(
        portName: info.portName,
        friendlyName: friendly,
        isHuaweiPcUi: isPcUi,
      );
    }).toList();

    // Поднимаем Huawei PC UI Interface наверх списка
    availablePorts.sort((a, b) => (b.isHuaweiPcUi ? 1 : 0) - (a.isHuaweiPcUi ? 1 : 0));
    _appendLog('SYS', 'Найдено COM-портов: \${availablePorts.length}');
    notifyListeners();
  }

  Future<void> connect(String portName, {int baudRate = 115200}) async {
    disconnect();
    try {
      final port = SerialPort(
        portName,
        openNow: false,
        BaudRate: baudRate,
        ByteSize: 8,
        StopBits: 0,
        Parity: 0,
      );
      port.open();
      if (!port.isOpened) {
        throw Exception('Не удалось открыть \$portName. Закройте программы-конкуренты.');
      }

      _port = port;
      activePortName = portName;
      isConnected = true;

      storage.lastPort = portName;
      storage.baudRate = baudRate;
      await storage.save();

      _appendLog('SYS', 'Открыт порт \$portName (\$baudRate 8N1)');
      await probeDevice();

      _pollTimer = Timer.periodic(
        Duration(seconds: storage.pollIntervalSec),
        (_) => pollSignal(),
      );
      notifyListeners();
    } catch (e) {
      _appendLog('SYS', 'Ошибка подключения: \$e');
      rethrow;
    }
  }

  void disconnect() {
    _pollTimer?.cancel();
    _pollTimer = null;
    if (_port != null && _port!.isOpened) {
      _port!.close();
    }
    _port = null;
    isConnected = false;
    activePortName = null;
    _appendLog('SYS', 'Соединение закрыто');
    notifyListeners();
  }

  /// Потокобезопасная отправка AT-команды через последовательную очередь
  Future<String> sendAt(String command, {Duration timeout = const Duration(seconds: 3)}) {
    final completer = Completer<String>();
    _queue = _queue.then((_) async {
      try {
        final result = await _sendAtInternal(command, timeout);
        completer.complete(result);
      } catch (e) {
        completer.completeError(e);
      }
    });
    return completer.future;
  }

  Future<String> _sendAtInternal(String command, Duration timeout) async {
    final port = _port;
    if (port == null || !port.isOpened) {
      throw StateError('COM-порт не открыт');
    }

    final clean = command.trim();
    _appendLog('TX', clean);

    final bytes = Uint8List.fromList(ascii.encode('\$clean\\r'));
    port.writeBytesFromUint8List(bytes);

    final buffer = StringBuffer();
    final deadline = DateTime.now().add(timeout);

    while (DateTime.now().isBefore(deadline)) {
      final chunk = await port.readBytes(512, timeout: const Duration(milliseconds: 120));
      if (chunk.isNotEmpty) {
        buffer.write(latin1.decode(chunk, allowInvalid: true));
        final text = buffer.toString();
        if (text.contains('\\r\\nOK\\r\\n') ||
            text.contains('\\r\\nERROR\\r\\n') ||
            text.contains('+CME ERROR:') ||
            text.contains('+CMS ERROR:') ||
            (clean.startsWith('AT+CUSD=') && text.contains('+CUSD:'))) {
          break;
        }
      }
      await Future<void>.delayed(const Duration(milliseconds: 30));
    }

    final response = buffer.toString().trim();
    _appendLog('RX', response.isEmpty ? '(таймаут)' : response);
    return response;
  }

  Future<void> probeDevice() async {
    if (!isConnected) return;
    isBusy = true;
    notifyListeners();

    try {
      await sendAt('ATE0');
      final ati = await sendAt('ATI');
      final imsiRaw = await sendAt('AT+CIMI');
      final pinRaw = await sendAt('AT+CPIN?');
      final copsRaw = await sendAt('AT+COPS?');
      final sysRaw = await sendAt('AT^SYSINFO');
      final u2Raw = await sendAt('AT^U2DIAG?');
      final voiceRaw = await sendAt('AT^CVOICE?');
      final lockRaw = await sendAt('AT^CARDLOCK?');

      final mfg = RegExp(r'Manufacturer:\\s*(.+)').firstMatch(ati)?.group(1)?.trim();
      final mdl = RegExp(r'Model:\\s*(.+)').firstMatch(ati)?.group(1)?.trim();
      final rev = RegExp(r'Revision:\\s*(.+)').firstMatch(ati)?.group(1)?.trim();
      final imei = RegExp(r'IMEI:\\s*(\\d+)').firstMatch(ati)?.group(1)?.trim();
      final imsi = RegExp(r'(\\d{14,16})').firstMatch(imsiRaw)?.group(1);
      final sim = RegExp(r'\\+CPIN:\\s*([A-Z ]+)').firstMatch(pinRaw)?.group(1)?.trim();
      final op = RegExp(r'\\+COPS:\\s*\\d+,\\d+,"([^"]+)"').firstMatch(copsRaw)?.group(1);

      var tech = 'WCDMA';
      final sysMatch = RegExp(r'\\^SYSINFO:\\s*\\d+,\\d+,\\d+,(\\d+)').firstMatch(sysRaw);
      if (sysMatch != null) {
        switch (int.tryParse(sysMatch.group(1) ?? '')) {
          case 0:
            tech = 'Нет сети';
            break;
          case 3:
            tech = 'EDGE';
            break;
          case 5:
            tech = 'WCDMA';
            break;
          case 15:
            tech = 'HSDPA';
            break;
        }
      }

      final u2 = int.tryParse(RegExp(r'(\\d+)').firstMatch(u2Raw)?.group(1) ?? '') ?? 0;
      final voice = RegExp(r'\\^CVOICE:\\s*0').hasMatch(voiceRaw);
      final lockMatch = RegExp(r'\\^CARDLOCK:\\s*(\\d+),(\\d+)').firstMatch(lockRaw);
      final lockState = lockMatch?.group(1) == '1' ? 'Заблокирован' : 'Разблокирован';
      final attempts = int.tryParse(lockMatch?.group(2) ?? '10') ?? 10;

      snapshot = snapshot.copyWith(
        manufacturer: mfg ?? 'Huawei',
        model: mdl ?? 'E173',
        revision: rev ?? '—',
        imei: imei ?? '—',
        imsi: imsi ?? '—',
        simStatus: sim ?? 'READY',
        operatorName: op ?? 'Поиск сети...',
        networkTech: tech,
        u2diag: u2,
        voiceEnabled: voice,
        cardLockStatus: lockState,
        cardLockAttempts: attempts,
      );
      await pollSignal();
    } finally {
      isBusy = false;
      notifyListeners();
    }
  }

  Future<void> pollSignal() async {
    if (!isConnected) return;
    try {
      final res = await sendAt('AT+CSQ', timeout: const Duration(milliseconds: 1200));
      final match = RegExp(r'\\+CSQ:\\s*(\\d+),(\\d+)').firstMatch(res);
      if (match != null) {
        final csq = int.parse(match.group(1)!);
        final dbm = Ucs2Codec.csqToDbm(csq);
        final pct = Ucs2Codec.csqToPercent(csq);
        snapshot = snapshot.copyWith(csq: csq, rssiDbm: dbm, signalPercent: pct);
        rssiHistory.add(dbm);
        if (rssiHistory.length > 30) rssiHistory.removeAt(0);
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> fetchSms() async {
    if (!isConnected) return;
    await sendAt('AT+CMGF=1');
    await sendAt('AT+CSCS="UCS2"');
    final raw = await sendAt('AT+CMGL="ALL"', timeout: const Duration(seconds: 5));

    final regex = RegExp(
      r'\\+CMGL:\\s*(\\d+),"([^"]+)","([^"]*)",[^,]*,"([^"]*)"\\r?\\n([^\\r\\n]+)',
    );

    final parsed = <SmsRecord>[];
    for (final m in regex.allMatches(raw)) {
      parsed.add(SmsRecord(
        index: int.parse(m.group(1)!),
        status: m.group(2)!,
        sender: Ucs2Codec.smartDecode(m.group(3)!),
        timestamp: m.group(4)!,
        body: Ucs2Codec.smartDecode(m.group(5)!),
      ));
    }
    smsList = parsed.reversed.toList();
    notifyListeners();
  }

  Future<void> sendSms(String phone, String text) async {
    if (!isConnected || _port == null) return;
    final hexPhone = Ucs2Codec.encodeUcs2Hex(phone.trim());
    final hexBody = Ucs2Codec.encodeUcs2Hex(text);

    await sendAt('AT+CMGF=1');
    await sendAt('AT+CSCS="UCS2"');
    await sendAt('AT+CSMP=17,167,0,8');

    _appendLog('TX', 'AT+CMGS="\$hexPhone"');
    _port!.writeBytesFromUint8List(Uint8List.fromList(ascii.encode('AT+CMGS="\$hexPhone"\\r')));
    await Future<void>.delayed(const Duration(milliseconds: 250));
    _port!.writeBytesFromUint8List(Uint8List.fromList([...ascii.encode(hexBody), 0x1A]));
    await Future<void>.delayed(const Duration(seconds: 2));
    _appendLog('SYS', 'SMS отправлено на \$phone');
  }

  Future<void> deleteSms(int index) async {
    await sendAt('AT+CMGD=\$index');
    smsList.removeWhere((e) => e.index == index);
    notifyListeners();
  }

  Future<void> sendUssd(String code) async {
    final packed = Ucs2Codec.encodeGsm7PackedHex(code.trim());
    final raw = await sendAt('AT+CUSD=1,"\$packed",15', timeout: const Duration(seconds: 8));
    final match = RegExp(r'\\+CUSD:\\s*\\d+,"([^"]+)"(?:,(\\d+))?').firstMatch(raw);

    final decoded = match != null
        ? Ucs2Codec.smartDecode(match.group(1)!, dcs: int.tryParse(match.group(2) ?? '72'))
        : (raw.isEmpty ? 'Нет ответа от сети' : raw);

    ussdHistory.insert(
      0,
      UssdRecord(
        createdAt: DateTime.now(),
        code: code.trim(),
        response: decoded,
        rawLine: raw,
      ),
    );
    notifyListeners();
  }

  Future<void> setNetworkMode(String syscfgCmd) async {
    await sendAt(syscfgCmd);
    await probeDevice();
  }

  Future<void> setU2Diag(int mode) async {
    await sendAt('AT^U2DIAG=\$mode');
    snapshot = snapshot.copyWith(u2diag: mode);
    notifyListeners();
  }

  Future<void> setVoiceEnabled(bool enabled) async {
    await sendAt(enabled ? 'AT^CVOICE=0' : 'AT^CVOICE=1');
    snapshot = snapshot.copyWith(voiceEnabled: enabled);
    notifyListeners();
  }

  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}
`,
  },
  {
    path: 'lib/screens/dashboard_screen.dart',
    language: 'dart',
    summary: 'Экран обзора: выбор COM-порта, уровень сигнала dBm/ASU, параметры SIM и модема',
    content: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/huawei_modem_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String? _selectedPort;

  @override
  Widget build(BuildContext context) {
    final modem = context.watch<HuaweiModemService>();
    final s = modem.snapshot;

    if (_selectedPort == null && modem.availablePorts.isNotEmpty) {
      _selectedPort = modem.availablePorts.first.portName;
    }

    return Padding(
      padding: const EdgeInsets.all(24),
      child: ListView(
        children: [
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _selectedPort,
                  decoration: const InputDecoration(
                    labelText: 'COM-порт (выберите HUAWEI 3G PC UI Interface)',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  items: modem.availablePorts
                      .map(
                        (p) => DropdownMenuItem(
                          value: p.portName,
                          child: Text(
                            '\${p.portName} — \${p.friendlyName}',
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: modem.isConnected
                      ? null
                      : (v) => setState(() => _selectedPort = v),
                ),
              ),
              const SizedBox(width: 12),
              OutlinedButton.icon(
                onPressed: modem.refreshPorts,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Обновить'),
              ),
              const SizedBox(width: 12),
              FilledButton(
                onPressed: _selectedPort == null
                    ? null
                    : () async {
                        if (modem.isConnected) {
                          modem.disconnect();
                        } else {
                          await modem.connect(_selectedPort!);
                        }
                      },
                child: Text(modem.isConnected ? 'Отключить' : 'Подключить'),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: [
              _MetricCard(
                title: 'Уровень сигнала',
                value: '\${s.rssiDbm} dBm',
                subtitle: 'CSQ \${s.csq} · \${s.signalPercent}%',
              ),
              _MetricCard(
                title: 'Оператор и сеть',
                value: s.operatorName,
                subtitle: s.networkTech,
              ),
              _MetricCard(
                title: 'Статус SIM',
                value: s.simStatus,
                subtitle: 'Блокировка: \${s.cardLockStatus}',
              ),
              _MetricCard(
                title: 'Режим USB',
                value: 'U2DIAG = \${s.u2diag}',
                subtitle: s.voiceEnabled ? 'Голос: активен' : 'Голос: выключен',
              ),
            ],
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Паспорт устройства Huawei E173',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 12),
                  _InfoRow('Производитель', s.manufacturer),
                  _InfoRow('Модель', s.model),
                  _InfoRow('Прошивка (Revision)', s.revision),
                  _InfoRow('IMEI', s.imei),
                  _InfoRow('IMSI SIM-карты', s.imsi),
                  _InfoRow('Каталог настроек', modem.storage.baseDir),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 220,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              const SizedBox(height: 6),
              Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text(subtitle, style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          SizedBox(
            width: 210,
            child: Text(label, style: const TextStyle(color: Color(0xFF64748B))),
          ),
          Expanded(
            child: SelectableText(
              value,
              style: const TextStyle(fontFamily: 'Consolas', fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/screens/sms_screen.dart',
    language: 'dart',
    summary: 'Экран SMS: чтение SIM в UCS2, отправка на русском, удаление',
    content: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/huawei_modem_service.dart';

class SmsScreen extends StatefulWidget {
  const SmsScreen({super.key});

  @override
  State<SmsScreen> createState() => _SmsScreenState();
}

class _SmsScreenState extends State<SmsScreen> {
  final _phoneCtrl = TextEditingController();
  final _textCtrl = TextEditingController();

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _textCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final modem = context.watch<HuaweiModemService>();

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'SMS-сообщения (UCS2 Кириллица)',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const Spacer(),
              FilledButton.tonalIcon(
                onPressed: modem.isConnected ? modem.fetchSms : null,
                icon: const Icon(Icons.download, size: 18),
                label: const Text('Прочитать с SIM'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _phoneCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Номер получателя (+79...)',
                            border: OutlineInputBorder(),
                            isDense: true,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      FilledButton.icon(
                        onPressed: modem.isConnected
                            ? () async {
                                if (_phoneCtrl.text.isEmpty || _textCtrl.text.isEmpty) return;
                                await modem.sendSms(_phoneCtrl.text, _textCtrl.text);
                                _textCtrl.clear();
                              }
                            : null,
                        icon: const Icon(Icons.send, size: 16),
                        label: const Text('Отправить SMS'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _textCtrl,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'Текст сообщения (до 70 символов в 1 сегменте UCS2)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: modem.smsList.isEmpty
                ? const Center(
                    child: Text('Нажмите «Прочитать с SIM», чтобы загрузить SMS с модема.'),
                  )
                : ListView.separated(
                    itemCount: modem.smsList.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, idx) {
                      final msg = modem.smsList[idx];
                      return Card(
                        child: ListTile(
                          title: Text('\${msg.sender}  ·  \${msg.timestamp}'),
                          subtitle: Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: SelectableText(msg.body),
                          ),
                          trailing: IconButton(
                            tooltip: 'Удалить SMS',
                            icon: const Icon(Icons.delete_outline),
                            onPressed: () => modem.deleteSms(msg.index),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/screens/ussd_screen.dart',
    language: 'dart',
    summary: 'Экран USSD-запросов с быстрыми командами и декодированием ответов',
    content: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/huawei_modem_service.dart';

class UssdScreen extends StatefulWidget {
  const UssdScreen({super.key});

  @override
  State<UssdScreen> createState() => _UssdScreenState();
}

class _UssdScreenState extends State<UssdScreen> {
  final _codeCtrl = TextEditingController(text: '*100#');

  static const _presets = ['*100#', '*102#', '*105#', '*111#', '*205#'];

  @override
  void dispose() {
    _codeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final modem = context.watch<HuaweiModemService>();

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'USSD-запросы (Баланс и управление SIM)',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              SizedBox(
                width: 240,
                child: TextField(
                  controller: _codeCtrl,
                  decoration: const InputDecoration(
                    labelText: 'USSD-код',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              FilledButton(
                onPressed: modem.isConnected
                    ? () => modem.sendUssd(_codeCtrl.text)
                    : null,
                child: const Text('Выполнить'),
              ),
              const SizedBox(width: 16),
              Wrap(
                spacing: 8,
                children: _presets
                    .map(
                      (code) => OutlinedButton(
                        onPressed: modem.isConnected
                            ? () {
                                _codeCtrl.text = code;
                                modem.sendUssd(code);
                              }
                            : null,
                        child: Text(code),
                      ),
                    )
                    .toList(),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Expanded(
            child: ListView.separated(
              itemCount: modem.ussdHistory.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, idx) {
                final item = modem.ussdHistory[idx];
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '\${item.code}  ·  \${item.createdAt.toLocal().toString().substring(11, 19)}',
                          style: const TextStyle(
                            fontFamily: 'Consolas',
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1D4ED8),
                          ),
                        ),
                        const SizedBox(height: 8),
                        SelectableText(item.response),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/screens/engineering_screen.dart',
    language: 'dart',
    summary: 'Инженерные настройки Huawei E173: AT^SYSCFG, AT^U2DIAG, AT^CVOICE, перезагрузка',
    content: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/huawei_modem_service.dart';

class EngineeringScreen extends StatelessWidget {
  const EngineeringScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final modem = context.watch<HuaweiModemService>();
    final s = modem.snapshot;

    return Padding(
      padding: const EdgeInsets.all(24),
      child: ListView(
        children: [
          const Text(
            'Инженерная конфигурация Huawei E173',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Режим сети (AT^SYSCFG)', style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      OutlinedButton(
                        onPressed: modem.isConnected
                            ? () => modem.setNetworkMode('AT^SYSCFG=2,0,3FFFFFFF,1,2')
                            : null,
                        child: const Text('Авто (3G/2G)'),
                      ),
                      OutlinedButton(
                        onPressed: modem.isConnected
                            ? () => modem.setNetworkMode('AT^SYSCFG=14,2,3FFFFFFF,1,2')
                            : null,
                        child: const Text('Только 3G (WCDMA)'),
                      ),
                      OutlinedButton(
                        onPressed: modem.isConnected
                            ? () => modem.setNetworkMode('AT^SYSCFG=2,2,3FFFFFFF,1,2')
                            : null,
                        child: const Text('Приоритет 3G'),
                      ),
                      OutlinedButton(
                        onPressed: modem.isConnected
                            ? () => modem.setNetworkMode('AT^SYSCFG=13,1,3FFFFFFF,1,2')
                            : null,
                        child: const Text('Только 2G (GSM/EDGE)'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'USB-композиция модема (AT^U2DIAG) — текущий режим: \${s.u2diag}',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      FilledButton.tonal(
                        onPressed: modem.isConnected ? () => modem.setU2Diag(0) : null,
                        child: const Text('0 · Только модем (рекомендуется)'),
                      ),
                      OutlinedButton(
                        onPressed: modem.isConnected ? () => modem.setU2Diag(256) : null,
                        child: const Text('256 · Модем + MicroSD'),
                      ),
                      OutlinedButton(
                        onPressed: modem.isConnected ? () => modem.setU2Diag(257) : null,
                        child: const Text('257 · Модем + CD'),
                      ),
                      OutlinedButton(
                        onPressed: modem.isConnected ? () => modem.setU2Diag(255) : null,
                        child: const Text('255 · Заводской'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Expanded(
                    child: SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Голосовой канал (AT^CVOICE)'),
                      subtitle: const Text('Активация голосовых вызовов на Huawei E173'),
                      value: s.voiceEnabled,
                      onChanged: modem.isConnected ? modem.setVoiceEnabled : null,
                    ),
                  ),
                  const SizedBox(width: 24),
                  OutlinedButton.icon(
                    onPressed: modem.isConnected
                        ? () => modem.sendAt('AT+CFUN=1,1')
                        : null,
                    icon: const Icon(Icons.restart_alt),
                    label: const Text('Перезагрузить модем'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
`,
  },
  {
    path: 'lib/screens/terminal_screen.dart',
    language: 'dart',
    summary: 'Интерактивный AT-терминал с журналом TX/RX',
    content: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/huawei_modem_service.dart';

class TerminalScreen extends StatefulWidget {
  const TerminalScreen({super.key});

  @override
  State<TerminalScreen> createState() => _TerminalScreenState();
}

class _TerminalScreenState extends State<TerminalScreen> {
  final _cmdCtrl = TextEditingController(text: 'ATI');

  @override
  void dispose() {
    _cmdCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit(HuaweiModemService modem) async {
    final cmd = _cmdCtrl.text.trim();
    if (cmd.isEmpty || !modem.isConnected) return;
    await modem.sendAt(cmd);
    _cmdCtrl.clear();
  }

  @override
  Widget build(BuildContext context) {
    final modem = context.watch<HuaweiModemService>();

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _cmdCtrl,
                  style: const TextStyle(fontFamily: 'Consolas'),
                  decoration: const InputDecoration(
                    labelText: 'AT-команда (например ATI, AT+CSQ, AT^SYSINFO)',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  onSubmitted: (_) => _submit(modem),
                ),
              ),
              const SizedBox(width: 12),
              FilledButton(
                onPressed: modem.isConnected ? () => _submit(modem) : null,
                child: const Text('Отправить'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(10),
              ),
              child: ListView.builder(
                itemCount: modem.logs.length,
                itemBuilder: (_, i) {
                  final log = modem.logs[i];
                  final time = log.time.toLocal().toString().substring(11, 19);
                  final color = log.direction == 'TX'
                      ? const Color(0xFF60A5FA)
                      : log.direction == 'RX'
                          ? const Color(0xFF4ADE80)
                          : const Color(0xFFFBBF24);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: SelectableText(
                      '[\$time] \${log.direction}: \${log.text}',
                      style: TextStyle(
                        fontFamily: 'Consolas',
                        fontSize: 13,
                        color: color,
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
`,
  },
  {
    path: 'analysis_options.yaml',
    language: 'yaml',
    summary: 'Правила анализатора Dart/Flutter',
    content: `include: package:flutter_lints/flutter.yaml

linter:
  rules:
    prefer_const_constructors: true
    prefer_final_locals: true
    avoid_print: true
`,
  },
];

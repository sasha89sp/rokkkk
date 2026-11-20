import React, { useState } from 'react';
import { Check, Copy, Download, FileCode2, FolderTree, GitBranch } from 'lucide-react';
import { FLUTTER_PROJECT_FILES } from '../data/flutterProjectFiles';

interface FlutterSourceViewProps {
  onDownloadZip: () => Promise<void>;
}

const GIT_PUSH_SNIPPET = `git init
git add .
git commit -m "Huawei E173 portable Windows app"
git branch -M main
git remote add origin https://github.com/YOUR_USER/huawei-e173-portable.git
git push -u origin main`;

export const FlutterSourceView: React.FC<FlutterSourceViewProps> = ({
  onDownloadZip,
}) => {
  const [selectedPath, setSelectedPath] = useState<string>(
    FLUTTER_PROJECT_FILES[0].path
  );
  const [buildMode, setBuildMode] = useState<'github' | 'local'>('github');
  const [copiedFile, setCopiedFile] = useState(false);
  const [copiedGit, setCopiedGit] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const activeFile =
    FLUTTER_PROJECT_FILES.find((f) => f.path === selectedPath) ||
    FLUTTER_PROJECT_FILES[0];

  const handleCopyFile = async () => {
    await navigator.clipboard.writeText(activeFile.content);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 1800);
  };

  const handleCopyGit = async () => {
    await navigator.clipboard.writeText(GIT_PUSH_SNIPPET);
    setCopiedGit(true);
    setTimeout(() => setCopiedGit(false), 1800);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onDownloadZip();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Верхний блок: облачная компиляция на GitHub Actions и локальная сборка */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">
              Сборка портативного Windows .exe на GitHub Actions
            </h2>
            <p className="text-sm text-slate-600 max-w-3xl">
              В архив уже добавлен workflow{' '}
              <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                .github/workflows/build-windows-portable.yml
              </code>
              . GitHub сам скомпилирует Flutter под Windows x64 на сервере{' '}
              <code className="font-mono text-xs">windows-latest</code>, добавит системные{' '}
              <code className="font-mono text-xs">vcruntime140.dll</code> /{' '}
              <code className="font-mono text-xs">msvcp140.dll</code> и выдаст готовый портативный ZIP.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>
              {downloading
                ? 'Упаковка архива...'
                : 'Скачать Flutter-проект (.zip)'}
            </span>
          </button>
        </div>

        {/* Переключатель способа сборки */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md mb-4">
            <button
              type="button"
              onClick={() => setBuildMode('github')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                buildMode === 'github'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Компиляция на GitHub Actions
            </button>
            <button
              type="button"
              onClick={() => setBuildMode('local')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                buildMode === 'local'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Локальная сборка на Windows
            </button>
          </div>

          {buildMode === 'github' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="font-semibold text-slate-900">
                    01. Загрузите архив в репозиторий GitHub
                  </div>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    Скачайте ZIP, распакуйте папку <span className="font-mono">huawei_e173_manager</span>{' '}
                    и отправьте её в новый репозиторий на GitHub (публичный или приватный).
                    Устанавливать Flutter локально не требуется.
                  </p>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">
                    02. Автосборка на windows-latest
                  </div>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    Во вкладке <span className="font-semibold text-slate-800">Actions</span>{' '}
                    автоматически запустится workflow{' '}
                    <span className="font-mono">Build Portable Windows</span> (или запустите его
                    вручную кнопкой <span className="font-mono">Run workflow</span>).
                  </p>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">
                    03. Скачайте готовый .exe (Artifacts / Releases)
                  </div>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    Через 3–5 минут скачайте артефакт{' '}
                    <span className="font-mono">HuaweiE173_Portable_Win64.zip</span>. При пуше
                    тега <span className="font-mono">v1.0.0</span> архив автоматически
                    опубликуется в разделе <span className="font-semibold text-slate-800">Releases</span>.
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-md overflow-hidden">
                <div className="px-3.5 py-2 border-b border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                    <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                    <span>Команды отправки проекта в GitHub</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopyGit()}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white cursor-pointer"
                  >
                    {copiedGit ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Скопировано</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Копировать</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 text-xs font-mono text-slate-100 overflow-x-auto m-0 leading-relaxed">
                  <code>{GIT_PUSH_SNIPPET}</code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="font-semibold text-slate-900">
                  01. Распаковка архива на Windows
                </div>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  Распакуйте <span className="font-mono">huawei_e173_flutter_windows_portable.zip</span>{' '}
                  в папку без кириллицы, например <span className="font-mono">C:\dev\huawei_e173_manager</span>.
                </p>
              </div>
              <div>
                <div className="font-semibold text-slate-900">
                  02. Локальная сборка через bat-скрипт
                </div>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  Запустите <span className="font-mono">build_portable.bat</span> — скрипт выполнит{' '}
                  <span className="font-mono">flutter pub get</span>, соберёт Release x64 и упакует
                  портативную папку.
                </p>
              </div>
              <div>
                <div className="font-semibold text-slate-900">
                  03. Запуск с флешки без установки
                </div>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  Скопируйте каталог <span className="font-mono">dist\HuaweiE173_Portable</span> на
                  USB-флешку. Настройки сохраняются рядом с <span className="font-mono">.exe</span>.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Обозреватель файлов и просмотрщик кода */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Дерево файлов */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <FolderTree className="w-4 h-4 text-slate-400" />
              <span>Файлы проекта ({FLUTTER_PROJECT_FILES.length})</span>
            </div>
          </div>

          <ul className="divide-y divide-slate-100 overflow-y-auto max-h-[560px]">
            {FLUTTER_PROJECT_FILES.map((file) => {
              const active = file.path === activeFile.path;
              return (
                <li key={file.path}>
                  <button
                    type="button"
                    onClick={() => setSelectedPath(file.path)}
                    className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-50/70 text-blue-900'
                        : 'bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileCode2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          active ? 'text-blue-700' : 'text-slate-400'
                        }`}
                      />
                      <span className="font-mono text-xs font-medium truncate">
                        {file.path}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {file.summary}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Содержимое выбранного файла */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-mono text-xs font-medium text-slate-100 truncate">
                huawei_e173_manager/{activeFile.path}
              </div>
              <div className="text-xs text-slate-400 truncate mt-0.5">
                {activeFile.summary}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleCopyFile()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedFile ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Скопировано</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Копировать файл</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 text-xs font-mono text-slate-100 leading-relaxed overflow-auto max-h-[520px] dark-scroll m-0 flex-1">
            <code>{activeFile.content}</code>
          </pre>
        </div>
      </section>
    </div>
  );
};

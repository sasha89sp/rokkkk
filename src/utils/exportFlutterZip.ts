import JSZip from 'jszip';
import { FLUTTER_PROJECT_FILES } from '../data/flutterProjectFiles';

export async function downloadFlutterPortableZip(): Promise<void> {
  const zip = new JSZip();
  const rootFolder = zip.folder('huawei_e173_manager');

  if (!rootFolder) {
    throw new Error('Не удалось инициализировать ZIP-архив.');
  }

  for (const file of FLUTTER_PROJECT_FILES) {
    rootFolder.file(file.path, file.content);
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'huawei_e173_flutter_windows_portable.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

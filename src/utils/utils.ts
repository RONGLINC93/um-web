import { DecryptResult } from '@/decrypt/entity';
import { FileSystemDirectoryHandle } from '@/shims-fs';

export enum FilenamePolicy {
  ArtistAndTitle,
  TitleOnly,
  TitleAndArtist,
  SameAsOriginal,
}

export const FilenamePolicies: { key: FilenamePolicy; text: string }[] = [
  { key: FilenamePolicy.ArtistAndTitle, text: '歌手-歌曲名' },
  { key: FilenamePolicy.TitleOnly, text: '歌曲名' },
  { key: FilenamePolicy.TitleAndArtist, text: '歌曲名-歌手' },
  { key: FilenamePolicy.SameAsOriginal, text: '同源文件名' },
];

// 支持解密/导入的文件扩展名（小写，不含点），与 decrypt/index.ts 的 switch 保持一致
export const SUPPORTED_EXTENSIONS: string[] = [
  'mg3d', // 咪咕
  'ncm', 'uc', // 网易云
  'kwm', // 酷我
  'xm', 'wav', 'mp3', 'flac', 'm4a', 'ogg', // 虾米及原始音频
  'tm0', 'tm3', 'tm2', 'tm6', // QQ 音乐 iOS
  'qmc0', 'qmc2', 'qmc3', 'qmc4', 'qmc6', 'qmc8', 'qmcflac', 'qmcogg', 'tkm', // QQ 音乐 Android
  'bkcmp3', 'bkcm4a', 'bkcflac', 'bkcwav', 'bkcape', 'bkcogg', 'bkcwma', // Moo 音乐
  'mggl', 'mflac', 'mflac0', 'mflach', 'mgg', 'mgg0', 'mgg1', 'mmp4', // QQ 音乐 v2
  'cache', // QQ 音乐缓存
  'vpr', 'kgm', 'kgma', // 酷狗
  'ofl_en', // Joox
  'x2m', 'x3m', // 喜马拉雅
];

// el-upload 的 accept 属性字符串，用于文件选择对话框预过滤
export const SUPPORTED_ACCEPT = SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`).join(',');

export function getFileExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

export function isSupportedFile(name: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(getFileExt(name));
}

export function GetDownloadFilename(data: DecryptResult, policy: FilenamePolicy): string {
  switch (policy) {
    case FilenamePolicy.TitleOnly:
      return `${data.title}.${data.ext}`;
    case FilenamePolicy.TitleAndArtist:
      return `${data.title} - ${data.artist}.${data.ext}`;
    case FilenamePolicy.SameAsOriginal:
      return `${data.rawFilename}.${data.ext}`;
    default:
    case FilenamePolicy.ArtistAndTitle:
      return `${data.artist} - ${data.title}.${data.ext}`;
  }
}

export async function DirectlyWriteFile(data: DecryptResult, policy: FilenamePolicy, dir: FileSystemDirectoryHandle) {
  let filename = GetDownloadFilename(data, policy);
  // prevent filename exist
  try {
    await dir.getFileHandle(filename);
    filename = `${new Date().getTime()} - ${filename}`;
  } catch (e) {}
  const file = await dir.getFileHandle(filename, { create: true });
  const w = await file.createWritable();
  await w.write(data.blob);
  await w.close();
}

export function DownloadBlobMusic(data: DecryptResult, policy: FilenamePolicy) {
  const a = document.createElement('a');
  a.href = data.file;
  a.download = GetDownloadFilename(data, policy);
  document.body.append(a);
  a.click();
  a.remove();
}

export function RemoveBlobMusic(data: DecryptResult) {
  URL.revokeObjectURL(data.file);
  if (data.picture?.startsWith('blob:')) {
    URL.revokeObjectURL(data.picture);
  }
}

export class DecryptQueue {
  private readonly pending: (() => Promise<void>)[];
  private running: boolean;

  constructor() {
    this.pending = [];
    this.running = false;
  }

  queue(fn: () => Promise<void>) {
    this.pending.push(fn);
    this.consume();
  }

  private consume() {
    if (this.running) return;
    const fn = this.pending.shift();
    if (!fn) return;
    this.running = true;
    fn()
      .catch(console.error)
      .finally(() => {
        this.running = false;
        this.consume();
      });
  }
}

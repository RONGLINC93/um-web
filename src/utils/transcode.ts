// 将音频 Blob 转码为 MP3（浏览器解码 + lamejs 编码）
// lamejs 通过 public/js/lame.min.js 以全局 window.lamejs 形式提供

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

function joinUint8(chunks: Uint8Array[]): Uint8Array {
  let len = 0;
  for (const c of chunks) len += c.length;
  const out = new Uint8Array(len);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

// 让出主线程，使浏览器有机会渲染/响应交互
function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// 用户主动取消转换时抛出，用于与真正的失败区分
export class ConvertCancelled extends Error {
  constructor() {
    super('已取消转换');
    this.name = 'ConvertCancelled';
  }
}

/**
 * 将任意浏览器可解码的音频 Blob 转码为 MP3。
 * 编码过程分片执行并周期性让出主线程，避免长任务卡死页面；
 * 每次让出时检查 shouldCancel，可中途取消。
 * @param blob 原始音频（mp3/flac/m4a/wav/ogg 等）
 * @param bitRate MP3 码率，默认 128 kbps
 * @param onProgress 编码进度回调，参数为 0-100 的整数百分比
 * @param shouldCancel 返回 true 时中止编码（在分片间隙生效）
 */
export async function transcodeToMp3(
  blob: Blob,
  bitRate = 128,
  onProgress?: (percent: number) => void,
  shouldCancel?: () => boolean,
): Promise<Blob> {
  const cancelled = () => shouldCancel && shouldCancel();
  const lamejs: any = (window as any).lamejs;
  if (!lamejs || !lamejs.Mp3Encoder) {
    throw new Error('lamejs 未加载');
  }

  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('当前浏览器不支持 Web Audio');
  }

  const ctx = new AudioCtx();
  let audioBuffer: AudioBuffer;
  try {
    if (onProgress) onProgress(0); // 解码阶段开始，进度归零
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    ctx.close();
  }
  if (cancelled()) throw new ConvertCancelled();

  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitRate);

  const left = floatTo16BitPCM(audioBuffer.getChannelData(0));
  const right = channels > 1 ? floatTo16BitPCM(audioBuffer.getChannelData(1)) : left;

  const blockSize = 1152;
  const totalBlocks = Math.ceil(left.length / blockSize);
  let processed = 0;
  let lastReported = -1;
  let sliceStart = Date.now();
  const mp3Chunks: Uint8Array[] = [];
  for (let i = 0; i < left.length; i += blockSize) {
    const l = left.subarray(i, i + blockSize);
    const r = right.subarray(i, i + blockSize);
    const buf: Int8Array =
      channels > 1 ? encoder.encodeBuffer(l, r) : encoder.encodeBuffer(l);
    if (buf.length > 0) mp3Chunks.push(new Uint8Array(buf));

    processed++;
    if (onProgress && totalBlocks > 0) {
      const percent = Math.min(100, Math.floor((processed / totalBlocks) * 100));
      if (percent !== lastReported) {
        lastReported = percent;
        onProgress(percent);
      }
    }
    // 每编码约 40ms 就让出一次主线程，保证页面可交互（略微牺牲总耗时）
    if (Date.now() - sliceStart >= 40) {
      sliceStart = Date.now();
      await yieldToUi();
      if (cancelled()) throw new ConvertCancelled();
    }
  }
  const end: Int8Array = encoder.flush();
  if (end.length > 0) mp3Chunks.push(new Uint8Array(end));

  if (onProgress) onProgress(100);

  return new Blob([joinUint8(mp3Chunks)], { type: 'audio/mpeg' });
}

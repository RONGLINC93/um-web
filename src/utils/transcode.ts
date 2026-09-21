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

/**
 * 将任意浏览器可解码的音频 Blob 转码为 MP3。
 * @param blob 原始音频（mp3/flac/m4a/wav/ogg 等）
 * @param bitRate MP3 码率，默认 128 kbps
 * @param onProgress 编码进度回调，参数为 0-100 的整数百分比
 */
export async function transcodeToMp3(
  blob: Blob,
  bitRate = 128,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
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

  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitRate);

  const left = floatTo16BitPCM(audioBuffer.getChannelData(0));
  const right = channels > 1 ? floatTo16BitPCM(audioBuffer.getChannelData(1)) : left;

  const blockSize = 1152;
  const totalBlocks = Math.ceil(left.length / blockSize);
  let processed = 0;
  let lastReported = -1;
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
  }
  const end: Int8Array = encoder.flush();
  if (end.length > 0) mp3Chunks.push(new Uint8Array(end));

  if (onProgress) onProgress(100);

  return new Blob([joinUint8(mp3Chunks)], { type: 'audio/mpeg' });
}

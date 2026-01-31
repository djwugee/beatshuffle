/**
 * Core Audio Processing Engine for BeatShuffle
 * Handles audio loading, manipulation, and export using Web Audio API
 */

export interface AudioData {
  leftChannel: Float32Array;
  rightChannel: Float32Array;
  sampleRate: number;
  duration: number;
}

export interface ProcessingOptions {
  normalize?: boolean;
  smoothing?: number;
  limitBeats?: number;
  limitLength?: number;
}

// Constants for pattern parsing
export const C_SLICE = ':><'; // 0 - range, 1 - first, 2 - last
export const C_JOIN = ',;~&^$}'; // 0 - append, 1 - first length, 2 - cut, 3 - maximum, 4 - sidechain
export const C_MISC = '\'"`i@_?%#![]';
// 0 ',1 " - sample, 2 ` - sample uncut, 3 i - current, 4 @ - random,
// 5 _ - random sep, 6 ? - not count, 7 % - create variable, 8 # - shuffle, 9 ! skip
// 10, 11 [] - song
export const C_MATH = '+-*/.';

/**
 * Safely evaluate mathematical expressions from pattern strings
 */
export function saferEval(str: string | number): number {
  if (typeof str === 'number') return str;
  if (!str || str.trim() === '') return 1;

  try {
    // Remove special characters that shouldn't be in math expressions
    let cleanStr = str;
    for (const char of [C_MISC[4], C_MISC[7], C_MISC[8]]) {
      const idx = cleanStr.indexOf(char);
      if (idx !== -1) cleanStr = cleanStr.substring(0, idx);
    }
    cleanStr = cleanStr.replace(/{/g, '<').replace(/}/g, '>');
    
    // Only allow numbers and math operators
    const sanitized = cleanStr.split('').filter(c => 
      /\d/.test(c) || C_MATH.includes(c)
    ).join('');
    
    if (!sanitized) return 1;
    
    // Use Function constructor for safe evaluation (no access to global scope)
    const result = new Function(`return ${sanitized}`)();
    return typeof result === 'number' && !isNaN(result) ? result : 1;
  } catch {
    return 1;
  }
}

/**
 * Load audio file and decode to AudioData
 */
export async function loadAudio(file: File): Promise<AudioData> {
  const audioContext = new AudioContext();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Get channel data (convert to stereo if mono)
  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = audioBuffer.numberOfChannels > 1 
    ? audioBuffer.getChannelData(1) 
    : new Float32Array(leftChannel);
  
  await audioContext.close();
  
  return {
    leftChannel: new Float32Array(leftChannel),
    rightChannel: new Float32Array(rightChannel),
    sampleRate: audioBuffer.sampleRate,
    duration: audioBuffer.duration,
  };
}

/**
 * Normalize audio to peak at 1.0
 */
export function normalizeAudio(audio: AudioData): AudioData {
  const maxLeft = Math.max(...Array.from(audio.leftChannel).map(Math.abs));
  const maxRight = Math.max(...Array.from(audio.rightChannel).map(Math.abs));
  const maxAmp = Math.max(maxLeft, maxRight);
  
  if (maxAmp === 0 || maxAmp === 1) return audio;
  
  const factor = 1 / maxAmp;
  
  return {
    ...audio,
    leftChannel: audio.leftChannel.map(s => s * factor),
    rightChannel: audio.rightChannel.map(s => s * factor),
  };
}

/**
 * Clip audio to -1, 1 range
 */
export function clipAudio(samples: Float32Array): Float32Array {
  return samples.map(s => Math.max(-1, Math.min(1, s)));
}

/**
 * Get a slice of audio between two sample indices
 */
export function getAudioSlice(
  audio: AudioData, 
  start: number, 
  end: number, 
  reverse: boolean = false
): { left: Float32Array; right: Float32Array } {
  const startIdx = Math.max(0, Math.floor(start));
  const endIdx = Math.min(audio.leftChannel.length, Math.floor(end));
  
  let left = audio.leftChannel.slice(startIdx, endIdx);
  let right = audio.rightChannel.slice(startIdx, endIdx);
  
  if (reverse) {
    left = left.slice().reverse();
    right = right.slice().reverse();
  }
  
  return { left, right };
}

/**
 * Concatenate multiple audio segments
 */
export function concatenateSegments(
  segments: Array<{ left: Float32Array; right: Float32Array }>
): { left: Float32Array; right: Float32Array } {
  if (segments.length === 0) {
    return { left: new Float32Array(0), right: new Float32Array(0) };
  }
  
  const totalLength = segments.reduce((sum, seg) => sum + seg.left.length, 0);
  const left = new Float32Array(totalLength);
  const right = new Float32Array(totalLength);
  
  let offset = 0;
  for (const segment of segments) {
    left.set(segment.left, offset);
    right.set(segment.right, offset);
    offset += segment.left.length;
  }
  
  return { left, right };
}

/**
 * Mix two audio segments (overlay)
 */
export function mixSegments(
  seg1: { left: Float32Array; right: Float32Array },
  seg2: { left: Float32Array; right: Float32Array },
  mode: 'first' | 'shortest' | 'longest' = 'first'
): { left: Float32Array; right: Float32Array } {
  let length: number;
  
  switch (mode) {
    case 'shortest':
      length = Math.min(seg1.left.length, seg2.left.length);
      break;
    case 'longest':
      length = Math.max(seg1.left.length, seg2.left.length);
      break;
    default:
      length = seg1.left.length;
  }
  
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  
  for (let i = 0; i < length; i++) {
    const s1L = i < seg1.left.length ? seg1.left[i] : 0;
    const s1R = i < seg1.right.length ? seg1.right[i] : 0;
    const s2L = i < seg2.left.length ? seg2.left[i] : 0;
    const s2R = i < seg2.right.length ? seg2.right[i] : 0;
    
    left[i] = s1L + s2L;
    right[i] = s1R + s2R;
  }
  
  // Normalize if clipping
  const maxAmp = Math.max(
    ...Array.from(left).map(Math.abs),
    ...Array.from(right).map(Math.abs)
  );
  
  if (maxAmp > 1.5) {
    const factor = 0.75 / maxAmp;
    for (let i = 0; i < length; i++) {
      left[i] *= factor;
      right[i] *= factor;
    }
  }
  
  return { left: clipAudio(left), right: clipAudio(right) };
}

/**
 * Apply volume effect to audio segment
 */
export function applyVolume(
  segment: { left: Float32Array; right: Float32Array },
  volume: number
): { left: Float32Array; right: Float32Array } {
  return {
    left: segment.left.map(s => s * volume),
    right: segment.right.map(s => s * volume),
  };
}

/**
 * Apply speed change effect (resampling)
 */
export function applySpeed(
  segment: { left: Float32Array; right: Float32Array },
  speed: number
): { left: Float32Array; right: Float32Array } {
  if (speed === 1) return segment;
  
  const originalLength = segment.left.length;
  const newLength = Math.floor(originalLength / speed);
  
  const left = new Float32Array(newLength);
  const right = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const srcIdx = i * speed;
    const srcIdxFloor = Math.floor(srcIdx);
    const srcIdxCeil = Math.min(srcIdxFloor + 1, originalLength - 1);
    const frac = srcIdx - srcIdxFloor;
    
    // Linear interpolation
    left[i] = segment.left[srcIdxFloor] * (1 - frac) + segment.left[srcIdxCeil] * frac;
    right[i] = segment.right[srcIdxFloor] * (1 - frac) + segment.right[srcIdxCeil] * frac;
  }
  
  return { left, right };
}

/**
 * Apply downsample effect
 */
export function applyDownsample(
  segment: { left: Float32Array; right: Float32Array },
  factor: number
): { left: Float32Array; right: Float32Array } {
  const f = Math.max(1, Math.floor(factor));
  const length = segment.left.length;
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  
  for (let i = 0; i < length; i++) {
    const sampleIdx = Math.floor(i / f) * f;
    left[i] = segment.left[sampleIdx];
    right[i] = segment.right[sampleIdx];
  }
  
  return { left, right };
}

/**
 * Apply gradient effect
 */
export function applyGradient(
  segment: { left: Float32Array; right: Float32Array }
): { left: Float32Array; right: Float32Array } {
  const left = new Float32Array(segment.left.length);
  const right = new Float32Array(segment.right.length);
  
  for (let i = 1; i < segment.left.length - 1; i++) {
    left[i] = (segment.left[i + 1] - segment.left[i - 1]) / 2;
    right[i] = (segment.right[i + 1] - segment.right[i - 1]) / 2;
  }
  
  left[0] = segment.left[1] - segment.left[0];
  right[0] = segment.right[1] - segment.right[0];
  left[left.length - 1] = segment.left[segment.left.length - 1] - segment.left[segment.left.length - 2];
  right[right.length - 1] = segment.right[segment.right.length - 1] - segment.right[segment.right.length - 2];
  
  return { left, right };
}

/**
 * Apply bitcrush effect
 */
export function applyBitcrush(
  segment: { left: Float32Array; right: Float32Array },
  bits: number
): { left: Float32Array; right: Float32Array } {
  const factor = bits < 1 ? 1 / bits : bits;
  const decimals = bits >= 1 ? 1 : Math.floor(1 / bits);
  
  const quantize = (sample: number): number => {
    if (bits >= 1) {
      return Math.round(sample * factor) / factor;
    } else {
      const multiplier = Math.pow(10, decimals);
      return Math.round(sample * multiplier) / multiplier;
    }
  };
  
  return {
    left: segment.left.map(quantize),
    right: segment.right.map(quantize),
  };
}

/**
 * Reverse audio segment
 */
export function reverseSegment(
  segment: { left: Float32Array; right: Float32Array }
): { left: Float32Array; right: Float32Array } {
  return {
    left: segment.left.slice().reverse(),
    right: segment.right.slice().reverse(),
  };
}

/**
 * Swap channels
 */
export function swapChannels(
  segment: { left: Float32Array; right: Float32Array }
): { left: Float32Array; right: Float32Array } {
  return {
    left: segment.right,
    right: segment.left,
  };
}

/**
 * Mute a channel (0 = left, 1 = right)
 */
export function muteChannel(
  segment: { left: Float32Array; right: Float32Array },
  channel: number
): { left: Float32Array; right: Float32Array } {
  if (channel === 0) {
    return {
      left: new Float32Array(segment.left.length),
      right: segment.right,
    };
  } else {
    return {
      left: segment.left,
      right: new Float32Array(segment.right.length),
    };
  }
}

/**
 * Apply an effect to a segment
 */
export function applyEffect(
  segment: { left: Float32Array; right: Float32Array },
  effectType: string,
  value: number | null
): { left: Float32Array; right: Float32Array } {
  switch (effectType) {
    case 'v': // volume
      return applyVolume(segment, value ?? 0);
    case 's': // speed
      return applySpeed(segment, value ?? 2);
    case 'd': // downsample
      return applyDownsample(segment, value ?? 8);
    case 'g': // gradient
      return applyGradient(segment);
    case 'b': // bitcrush
      return applyBitcrush(segment, value ?? 4);
    case 'r': // reverse
      return reverseSegment(segment);
    case 'c': // channel
      if (value === null || value === undefined) {
        return swapChannels(segment);
      }
      return muteChannel(segment, value);
    default:
      return segment;
  }
}

/**
 * Export processed audio as WAV file
 */
export function exportAsWav(
  leftChannel: Float32Array,
  rightChannel: Float32Array,
  sampleRate: number
): Blob {
  const numChannels = 2;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = leftChannel.length * blockAlign;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;
  
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  
  // Write WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Write interleaved audio data
  let offset = 44;
  for (let i = 0; i < leftChannel.length; i++) {
    // Clip and convert to 16-bit
    const leftSample = Math.max(-1, Math.min(1, leftChannel[i]));
    const rightSample = Math.max(-1, Math.min(1, rightChannel[i]));
    
    view.setInt16(offset, leftSample * 32767, true);
    view.setInt16(offset + 2, rightSample * 32767, true);
    offset += 4;
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Create an AudioContext for playback
 */
export function createPlaybackContext(): AudioContext {
  return new AudioContext();
}

/**
 * Play audio using Web Audio API
 */
export async function playAudio(
  leftChannel: Float32Array,
  rightChannel: Float32Array,
  sampleRate: number,
  audioContext?: AudioContext
): Promise<{ stop: () => void; audioContext: AudioContext }> {
  const ctx = audioContext || new AudioContext();
  
  const audioBuffer = ctx.createBuffer(2, leftChannel.length, sampleRate);
  audioBuffer.copyToChannel(leftChannel, 0);
  audioBuffer.copyToChannel(rightChannel, 1);
  
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);
  source.start();
  
  return {
    stop: () => {
      source.stop();
    },
    audioContext: ctx,
  };
}

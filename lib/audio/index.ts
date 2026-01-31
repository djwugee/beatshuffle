/**
 * BeatShuffle Audio Library
 * Complete client-side audio processing for beat manipulation
 */

export * from './audio-engine';
export * from './beat-detection';
export * from './pattern-parser';
export * from './presets';

import type { AudioData } from './audio-engine';
import { loadAudio, normalizeAudio, exportAsWav, playAudio } from './audio-engine';
import { detectBeats, adjustBeatmap, type BeatDetectionResult, type BeatDetectionOptions } from './beat-detection';
import { executePattern } from './pattern-parser';
import { getPreset, type Preset } from './presets';

export interface BeatswapOptions {
  pattern: string;
  scale?: number;
  shift?: number;
  normalize?: boolean;
  variableBPM?: boolean;
  onProgress?: (progress: number, status: string) => void;
}

export interface BeatswapResult {
  audio: {
    left: Float32Array;
    right: Float32Array;
    sampleRate: number;
  };
  beatmap: number[];
  bpm: number;
  beatCount: number;
}

/**
 * Main beatswap function - process an audio file with a pattern
 */
export async function beatswap(
  file: File,
  options: BeatswapOptions
): Promise<BeatswapResult> {
  const {
    pattern,
    scale = 1,
    shift = 0,
    normalize = true,
    variableBPM = false,
    onProgress,
  } = options;

  // Load audio
  onProgress?.(0, 'Loading audio file...');
  let audio = await loadAudio(file);
  
  // Normalize if requested
  if (normalize) {
    onProgress?.(0.05, 'Normalizing audio...');
    audio = normalizeAudio(audio);
  }
  
  // Detect beats
  onProgress?.(0.1, 'Detecting beats...');
  const beatDetectionResult = await detectBeats(
    audio,
    { variableBPM },
    (progress, status) => {
      onProgress?.(0.1 + progress * 0.5, status);
    }
  );
  
  // Adjust beatmap
  const beatmap = adjustBeatmap(beatDetectionResult.beatmap, 500);
  
  // Execute pattern
  onProgress?.(0.6, 'Processing pattern...');
  const processed = executePattern(
    audio,
    beatmap,
    pattern,
    scale,
    shift
  );
  
  onProgress?.(0.9, 'Finalizing...');
  
  return {
    audio: {
      left: processed.left,
      right: processed.right,
      sampleRate: audio.sampleRate,
    },
    beatmap,
    bpm: beatDetectionResult.bpm,
    beatCount: beatDetectionResult.beatCount,
  };
}

/**
 * Process audio with a preset
 */
export async function beatswapWithPreset(
  file: File,
  presetName: string,
  scaleIndex: number = 0,
  options: Omit<BeatswapOptions, 'pattern' | 'scale' | 'shift'> = {}
): Promise<BeatswapResult> {
  const preset = getPreset(presetName);
  
  if (!preset) {
    throw new Error(`Preset "${presetName}" not found`);
  }
  
  const scale = preset.scales[scaleIndex] ?? preset.scales[0] ?? 1;
  const shift = preset.shift ?? 0;
  
  return beatswap(file, {
    ...options,
    pattern: preset.pattern,
    scale,
    shift,
  });
}

/**
 * Export processed audio as WAV blob
 */
export function exportProcessedAudio(result: BeatswapResult): Blob {
  return exportAsWav(
    result.audio.left,
    result.audio.right,
    result.audio.sampleRate
  );
}

/**
 * Play processed audio
 */
export async function playProcessedAudio(
  result: BeatswapResult
): Promise<{ stop: () => void }> {
  return playAudio(
    result.audio.left,
    result.audio.right,
    result.audio.sampleRate
  );
}

/**
 * Download processed audio
 */
export function downloadProcessedAudio(
  result: BeatswapResult,
  filename: string = 'processed.wav'
): void {
  const blob = exportProcessedAudio(result);
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}

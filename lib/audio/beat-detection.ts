/**
 * Beat Detection Algorithm for BeatShuffle
 * Client-side beat detection using onset detection and tempo estimation
 * Implements a production-grade approach similar to madmom but for the browser
 */

import type { AudioData } from './audio-engine';

export interface BeatDetectionOptions {
  // Minimum BPM to detect
  minBPM?: number;
  // Maximum BPM to detect
  maxBPM?: number;
  // Whether to use variable tempo detection
  variableBPM?: boolean;
  // Sensitivity for onset detection (0-1)
  sensitivity?: number;
  // Frame size for analysis
  frameSize?: number;
  // Hop size between frames
  hopSize?: number;
}

export interface BeatDetectionResult {
  // Array of beat positions in samples
  beatmap: number[];
  // Estimated BPM
  bpm: number;
  // Confidence score (0-1)
  confidence: number;
  // Total number of beats detected
  beatCount: number;
}

const DEFAULT_OPTIONS: Required<BeatDetectionOptions> = {
  minBPM: 60,
  maxBPM: 200,
  variableBPM: false,
  sensitivity: 0.5,
  frameSize: 2048,
  hopSize: 512,
};

/**
 * Main beat detection function
 */
export async function detectBeats(
  audio: AudioData,
  options: BeatDetectionOptions = {},
  onProgress?: (progress: number, status: string) => void
): Promise<BeatDetectionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { sampleRate } = audio;
  
  onProgress?.(0, 'Preparing audio analysis...');
  
  // Mix to mono for analysis
  const monoSamples = mixToMono(audio.leftChannel, audio.rightChannel);
  
  onProgress?.(0.1, 'Computing spectral flux...');
  
  // Compute onset strength envelope using spectral flux
  const onsetEnvelope = computeOnsetEnvelope(monoSamples, sampleRate, opts);
  
  onProgress?.(0.3, 'Finding onset peaks...');
  
  // Find peaks in onset envelope (potential beat locations)
  const onsetPeaks = findOnsetPeaks(onsetEnvelope, opts.sensitivity);
  
  onProgress?.(0.5, 'Estimating tempo...');
  
  // Estimate tempo using autocorrelation
  const { bpm, confidence } = estimateTempo(
    onsetEnvelope, 
    sampleRate, 
    opts.hopSize, 
    opts.minBPM, 
    opts.maxBPM
  );
  
  onProgress?.(0.7, 'Tracking beats...');
  
  // Track beats using dynamic programming
  const beatmap = trackBeats(
    monoSamples,
    onsetEnvelope,
    onsetPeaks,
    bpm,
    sampleRate,
    opts.hopSize,
    opts.variableBPM
  );
  
  onProgress?.(0.9, 'Finalizing beat positions...');
  
  // Refine beat positions using local energy maxima
  const refinedBeatmap = refineBeatPositions(
    monoSamples,
    beatmap,
    sampleRate,
    opts.hopSize
  );
  
  onProgress?.(1, 'Beat detection complete');
  
  return {
    beatmap: refinedBeatmap,
    bpm,
    confidence,
    beatCount: refinedBeatmap.length,
  };
}

/**
 * Mix stereo to mono
 */
function mixToMono(left: Float32Array, right: Float32Array): Float32Array {
  const mono = new Float32Array(left.length);
  for (let i = 0; i < left.length; i++) {
    mono[i] = (left[i] + right[i]) / 2;
  }
  return mono;
}

/**
 * Compute onset strength envelope using spectral flux
 */
function computeOnsetEnvelope(
  samples: Float32Array,
  sampleRate: number,
  opts: Required<BeatDetectionOptions>
): Float32Array {
  const { frameSize, hopSize } = opts;
  const numFrames = Math.floor((samples.length - frameSize) / hopSize) + 1;
  const envelope = new Float32Array(numFrames);
  
  // Frequency weights (emphasize bass and midrange for beat detection)
  const freqWeights = new Float32Array(frameSize / 2);
  for (let i = 0; i < freqWeights.length; i++) {
    const freq = (i * sampleRate) / frameSize;
    // Weight frequencies in 20-200Hz range more heavily (kick drums, bass)
    if (freq < 20) {
      freqWeights[i] = 0.1;
    } else if (freq < 200) {
      freqWeights[i] = 1.5;
    } else if (freq < 2000) {
      freqWeights[i] = 1.0;
    } else {
      freqWeights[i] = 0.5;
    }
  }
  
  let prevMagnitudes = new Float32Array(frameSize / 2);
  
  for (let frame = 0; frame < numFrames; frame++) {
    const start = frame * hopSize;
    
    // Extract frame with Hann window
    const frameData = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) {
      const windowValue = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frameSize - 1)));
      frameData[i] = (samples[start + i] || 0) * windowValue;
    }
    
    // Compute FFT magnitudes
    const magnitudes = computeFFTMagnitudes(frameData);
    
    // Compute spectral flux (positive differences only)
    let flux = 0;
    for (let i = 0; i < magnitudes.length; i++) {
      const diff = magnitudes[i] - prevMagnitudes[i];
      if (diff > 0) {
        flux += diff * freqWeights[i];
      }
    }
    
    envelope[frame] = flux;
    prevMagnitudes = magnitudes;
  }
  
  // Normalize envelope
  const maxVal = Math.max(...envelope);
  if (maxVal > 0) {
    for (let i = 0; i < envelope.length; i++) {
      envelope[i] /= maxVal;
    }
  }
  
  // Apply adaptive thresholding
  const smoothedEnvelope = adaptiveThreshold(envelope, 100);
  
  return smoothedEnvelope;
}

/**
 * Simple FFT magnitude computation using DFT for small frame sizes
 */
function computeFFTMagnitudes(frame: Float32Array): Float32Array {
  const N = frame.length;
  const halfN = N / 2;
  const magnitudes = new Float32Array(halfN);
  
  // Use optimized DFT for beat detection (we don't need full precision)
  // Only compute positive frequencies
  for (let k = 0; k < halfN; k++) {
    let real = 0;
    let imag = 0;
    
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      real += frame[n] * Math.cos(angle);
      imag -= frame[n] * Math.sin(angle);
    }
    
    magnitudes[k] = Math.sqrt(real * real + imag * imag);
  }
  
  return magnitudes;
}

/**
 * Apply adaptive threshold to onset envelope
 */
function adaptiveThreshold(
  envelope: Float32Array,
  windowSize: number
): Float32Array {
  const result = new Float32Array(envelope.length);
  const halfWindow = Math.floor(windowSize / 2);
  
  for (let i = 0; i < envelope.length; i++) {
    // Compute local mean
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - halfWindow); j < Math.min(envelope.length, i + halfWindow); j++) {
      sum += envelope[j];
      count++;
    }
    const localMean = sum / count;
    
    // Subtract threshold
    result[i] = Math.max(0, envelope[i] - localMean * 1.2);
  }
  
  return result;
}

/**
 * Find peaks in the onset envelope
 */
function findOnsetPeaks(
  envelope: Float32Array,
  sensitivity: number
): number[] {
  const peaks: number[] = [];
  const threshold = (1 - sensitivity) * 0.3;
  const minPeakDistance = 4; // Minimum frames between peaks
  
  for (let i = 2; i < envelope.length - 2; i++) {
    // Check if this is a local maximum
    if (envelope[i] > envelope[i - 1] && 
        envelope[i] > envelope[i + 1] &&
        envelope[i] > envelope[i - 2] &&
        envelope[i] > envelope[i + 2] &&
        envelope[i] > threshold) {
      
      // Check minimum distance from previous peak
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minPeakDistance) {
        peaks.push(i);
      } else if (envelope[i] > envelope[peaks[peaks.length - 1]]) {
        // Replace previous peak if this one is stronger
        peaks[peaks.length - 1] = i;
      }
    }
  }
  
  return peaks;
}

/**
 * Estimate tempo using autocorrelation of onset envelope
 */
function estimateTempo(
  envelope: Float32Array,
  sampleRate: number,
  hopSize: number,
  minBPM: number,
  maxBPM: number
): { bpm: number; confidence: number } {
  const framesPerSecond = sampleRate / hopSize;
  const minLag = Math.floor(framesPerSecond * 60 / maxBPM);
  const maxLag = Math.floor(framesPerSecond * 60 / minBPM);
  
  // Compute autocorrelation
  const autocorr = new Float32Array(maxLag + 1);
  
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < envelope.length - lag; i++) {
      sum += envelope[i] * envelope[i + lag];
    }
    autocorr[lag] = sum / (envelope.length - lag);
  }
  
  // Find peaks in autocorrelation
  let bestLag = minLag;
  let bestValue = autocorr[minLag];
  
  for (let lag = minLag; lag <= maxLag; lag++) {
    // Weight towards musically common tempos (120, 128, 140 BPM)
    const bpm = (framesPerSecond * 60) / lag;
    let weight = 1;
    
    // Boost common tempo ranges
    if (bpm >= 118 && bpm <= 132) weight = 1.3; // House, techno
    else if (bpm >= 138 && bpm <= 145) weight = 1.2; // DnB
    else if (bpm >= 85 && bpm <= 95) weight = 1.15; // Hip hop
    else if (bpm >= 170 && bpm <= 180) weight = 1.1; // Jungle
    
    const weightedValue = autocorr[lag] * weight;
    
    if (weightedValue > bestValue) {
      bestValue = weightedValue;
      bestLag = lag;
    }
  }
  
  // Check for half/double tempo
  const halfLag = bestLag * 2;
  const doubleLag = Math.floor(bestLag / 2);
  
  if (halfLag <= maxLag && autocorr[halfLag] > bestValue * 0.8) {
    // Might be half tempo
    const halfBPM = (framesPerSecond * 60) / halfLag;
    if (halfBPM >= minBPM) {
      bestLag = halfLag;
      bestValue = autocorr[halfLag];
    }
  }
  
  if (doubleLag >= minLag && autocorr[doubleLag] > bestValue * 0.9) {
    // Might be double tempo
    const doubleBPM = (framesPerSecond * 60) / doubleLag;
    if (doubleBPM <= maxBPM) {
      bestLag = doubleLag;
      bestValue = autocorr[doubleLag];
    }
  }
  
  const bpm = (framesPerSecond * 60) / bestLag;
  const maxAutocorr = Math.max(...autocorr);
  const confidence = maxAutocorr > 0 ? bestValue / maxAutocorr : 0.5;
  
  return { bpm: Math.round(bpm * 10) / 10, confidence };
}

/**
 * Track beats using dynamic programming
 */
function trackBeats(
  samples: Float32Array,
  onsetEnvelope: Float32Array,
  onsetPeaks: number[],
  bpm: number,
  sampleRate: number,
  hopSize: number,
  variableBPM: boolean
): number[] {
  const framesPerBeat = (sampleRate / hopSize) * (60 / bpm);
  const tolerance = variableBPM ? 0.3 : 0.15; // Allow more variation if variable BPM
  
  if (onsetPeaks.length === 0) {
    // No peaks detected, create uniform grid
    const beatInterval = Math.floor(framesPerBeat);
    const beats: number[] = [];
    for (let i = 0; i < onsetEnvelope.length; i += beatInterval) {
      beats.push(i);
    }
    return beats.map(f => f * hopSize);
  }
  
  // Dynamic programming to find optimal beat sequence
  const beats: number[] = [];
  
  // Find first beat (strongest onset in first few expected beats)
  const searchRange = Math.floor(framesPerBeat * 2);
  let firstBeat = 0;
  let maxOnset = 0;
  
  for (const peak of onsetPeaks) {
    if (peak > searchRange) break;
    if (onsetEnvelope[peak] > maxOnset) {
      maxOnset = onsetEnvelope[peak];
      firstBeat = peak;
    }
  }
  
  beats.push(firstBeat);
  
  // Track subsequent beats
  let currentBeat = firstBeat;
  
  while (currentBeat < onsetEnvelope.length - framesPerBeat) {
    const expectedNext = currentBeat + framesPerBeat;
    const searchStart = Math.floor(expectedNext * (1 - tolerance));
    const searchEnd = Math.ceil(expectedNext * (1 + tolerance));
    
    // Find best onset peak in search range
    let bestPeak = -1;
    let bestScore = -Infinity;
    
    for (const peak of onsetPeaks) {
      if (peak < searchStart) continue;
      if (peak > searchEnd) break;
      
      // Score based on onset strength and distance from expected
      const distance = Math.abs(peak - expectedNext) / framesPerBeat;
      const positionScore = 1 - distance;
      const onsetScore = onsetEnvelope[peak];
      const score = positionScore * 0.6 + onsetScore * 0.4;
      
      if (score > bestScore) {
        bestScore = score;
        bestPeak = peak;
      }
    }
    
    // If no good peak found, use expected position
    if (bestPeak === -1 || bestScore < 0.3) {
      currentBeat = Math.round(expectedNext);
    } else {
      currentBeat = bestPeak;
    }
    
    if (currentBeat < onsetEnvelope.length) {
      beats.push(currentBeat);
    }
  }
  
  // Convert frame indices to sample indices
  return beats.map(f => f * hopSize);
}

/**
 * Refine beat positions using local energy maxima
 */
function refineBeatPositions(
  samples: Float32Array,
  beatmap: number[],
  sampleRate: number,
  hopSize: number
): number[] {
  const searchWindow = Math.floor(sampleRate * 0.02); // 20ms window
  
  return beatmap.map(beatPos => {
    const start = Math.max(0, beatPos - searchWindow);
    const end = Math.min(samples.length, beatPos + searchWindow);
    
    // Find local energy maximum
    let maxEnergy = 0;
    let maxPos = beatPos;
    
    for (let i = start; i < end; i++) {
      const energy = samples[i] * samples[i];
      if (energy > maxEnergy) {
        maxEnergy = energy;
        maxPos = i;
      }
    }
    
    return maxPos;
  });
}

/**
 * Adjust beatmap with a fixed offset
 */
export function adjustBeatmap(beatmap: number[], adjust: number): number[] {
  return beatmap.map(pos => Math.max(0, pos - adjust)).sort((a, b) => a - b);
}

/**
 * Create a beatmap from BPM and audio length
 */
export function createBeatmapFromBPM(
  bpm: number,
  sampleRate: number,
  totalSamples: number,
  startOffset: number = 0
): number[] {
  const samplesPerBeat = (sampleRate * 60) / bpm;
  const beats: number[] = [];
  
  for (let pos = startOffset; pos < totalSamples; pos += samplesPerBeat) {
    beats.push(Math.floor(pos));
  }
  
  return beats;
}

/**
 * Quantize beatmap to a grid
 */
export function quantizeBeatmap(
  beatmap: number[],
  sampleRate: number,
  bpm: number,
  strength: number = 0.5
): number[] {
  const samplesPerBeat = (sampleRate * 60) / bpm;
  
  return beatmap.map(pos => {
    const nearestBeatIndex = Math.round(pos / samplesPerBeat);
    const nearestGridPos = nearestBeatIndex * samplesPerBeat;
    return Math.floor(pos + (nearestGridPos - pos) * strength);
  });
}

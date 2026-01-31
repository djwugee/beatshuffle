/**
 * Pattern Parser for BeatShuffle
 * Parses pattern strings into executable beat manipulation instructions
 */

import { 
  C_SLICE, 
  C_JOIN, 
  C_MISC, 
  C_MATH, 
  saferEval,
  type AudioData,
  getAudioSlice,
  concatenateSegments,
  mixSegments,
  applyEffect,
  clipAudio,
} from './audio-engine';
import { generateRandomPattern } from './presets';

export interface ParsedBeat {
  // Beat index or range
  beat: number | { start: number; end: number; sliceType: string };
  // Effects to apply [effectType, value]
  effects: Array<[string, number | null]>;
  // Is this beat reversed?
  reverse?: boolean;
  // Should this beat be skipped (!)
  skip?: boolean;
  // Should this beat not count for length (?)
  noCount?: boolean;
  // Shuffle group
  shuffleGroup?: string;
}

export interface ParsedPattern {
  beats: ParsedBeat[];
  operators: string[];
  patternLength: number;
  shuffleGroups: Map<string, number[]>;
}

/**
 * Parse a pattern string into structured data
 */
export function parsePattern(pattern: string, providedLength?: number): ParsedPattern {
  // Clean up pattern
  pattern = pattern.replace(/\s+/g, ' ').trim();
  
  // Remove pipe characters (visual separators)
  pattern = pattern.replace(/\|/g, ',');
  
  // Handle double separators
  for (const sep of C_JOIN) {
    while (pattern.includes(sep + sep)) {
      pattern = pattern.replace(sep + sep, sep);
    }
    // Remove leading/trailing separators
    while (pattern.startsWith(sep)) pattern = pattern.substring(1);
    while (pattern.endsWith(sep)) pattern = pattern.slice(0, -1);
  }
  
  const beats: ParsedBeat[] = [];
  const operators: string[] = [','];
  const shuffleGroups = new Map<string, number[]>();
  
  let maxBeat = 0;
  let currentBeatIndex = 0;
  
  // Split by comma first (main separator)
  const parts = splitByOperators(pattern);
  
  for (const { value, operator } of parts) {
    if (!value.trim()) continue;
    
    const parsedBeat = parseBeatExpression(value.trim());
    
    if (parsedBeat) {
      // Track max beat number for pattern length
      if (typeof parsedBeat.beat === 'number' && !parsedBeat.noCount) {
        maxBeat = Math.max(maxBeat, parsedBeat.beat);
      } else if (typeof parsedBeat.beat === 'object' && !parsedBeat.noCount) {
        maxBeat = Math.max(maxBeat, parsedBeat.beat.start, parsedBeat.beat.end);
      }
      
      // Handle shuffle groups
      if (parsedBeat.shuffleGroup) {
        if (!shuffleGroups.has(parsedBeat.shuffleGroup)) {
          shuffleGroups.set(parsedBeat.shuffleGroup, []);
        }
        shuffleGroups.get(parsedBeat.shuffleGroup)!.push(currentBeatIndex);
      }
      
      beats.push(parsedBeat);
      operators.push(operator || ',');
      currentBeatIndex++;
    }
  }
  
  const patternLength = providedLength ?? Math.ceil(maxBeat);
  
  return { beats, operators, patternLength, shuffleGroups };
}

/**
 * Split pattern string by operators while preserving the operators
 */
function splitByOperators(pattern: string): Array<{ value: string; operator: string }> {
  const results: Array<{ value: string; operator: string }> = [];
  let current = '';
  let depth = 0; // Track parentheses/brackets depth
  
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    
    // Track depth for nested expressions
    if (char === '(' || char === '[') depth++;
    if (char === ')' || char === ']') depth--;
    
    // Only split at top level
    if (depth === 0 && C_JOIN.includes(char)) {
      if (current.trim()) {
        results.push({ value: current.trim(), operator: char });
      }
      current = '';
    } else {
      current += char;
    }
  }
  
  // Don't forget the last part
  if (current.trim()) {
    results.push({ value: current.trim(), operator: ',' });
  }
  
  return results;
}

/**
 * Parse a single beat expression
 */
function parseBeatExpression(expr: string): ParsedBeat | null {
  if (!expr) return null;
  
  let beat: number | { start: number; end: number; sliceType: string };
  const effects: Array<[string, number | null]> = [];
  let reverse = false;
  let skip = false;
  let noCount = false;
  let shuffleGroup: string | undefined;
  
  // Check for skip marker (!)
  if (expr.includes('!')) {
    skip = true;
    expr = expr.replace(/!/g, '');
  }
  
  // Check for noCount marker (?)
  if (expr.includes('?')) {
    noCount = true;
    expr = expr.replace(/\?/g, '');
  }
  
  // Check for shuffle group (#)
  const shuffleMatch = expr.match(/#(\d+)/);
  if (shuffleMatch) {
    shuffleGroup = shuffleMatch[1];
    expr = expr.replace(/#\d+/g, '');
  }
  
  // Parse effects (letters followed by optional numbers)
  // Effects are: v (volume), s (speed), d (downsample), g (gradient), b (bitcrush), r (reverse), c (channel)
  const effectPattern = /([vsdgbrc])(-?\d*\.?\d*(?:\/\d+)?)/gi;
  let effectMatch;
  let cleanExpr = expr;
  
  while ((effectMatch = effectPattern.exec(expr)) !== null) {
    const effectType = effectMatch[1].toLowerCase();
    const effectValue = effectMatch[2] ? saferEval(effectMatch[2]) : null;
    
    if (effectType === 'r') {
      reverse = true;
    }
    
    effects.push([effectType, effectValue]);
    cleanExpr = cleanExpr.replace(effectMatch[0], '');
  }
  
  // Clean up the expression for beat parsing
  cleanExpr = cleanExpr.trim();
  
  // Check for 'i' (current beat marker) - will be replaced during execution
  cleanExpr = cleanExpr.replace(/i/gi, '0');
  
  // Parse beat number or range
  // Check for slice operators (: > <)
  let sliceMatch = cleanExpr.match(/^(-?\d*\.?\d*(?:\/\d+)?)\s*([:<>])\s*(-?\d*\.?\d*(?:\/\d+)?)$/);
  
  if (sliceMatch) {
    const start = saferEval(sliceMatch[1] || '0');
    const sliceType = sliceMatch[2];
    const end = saferEval(sliceMatch[3] || '1');
    
    beat = { start, end, sliceType };
  } else {
    // Single beat number
    const beatNum = saferEval(cleanExpr || '1');
    beat = beatNum;
  }
  
  return { beat, effects, reverse, skip, noCount, shuffleGroup };
}

/**
 * Replace 'i' in pattern with current beat number
 */
function replaceCurrentBeat(pattern: string, currentBeat: number): string {
  // Replace 'i' with current beat, handling math expressions like i+4
  return pattern.replace(/\bi\b/gi, currentBeat.toString());
}

/**
 * Shuffle beats within groups
 */
function shuffleBeatsInGroups(
  beats: ParsedBeat[], 
  shuffleGroups: Map<string, number[]>
): ParsedBeat[] {
  const shuffled = [...beats];
  
  for (const [, indices] of shuffleGroups) {
    // Get the beats in this group
    const groupBeats = indices.map(i => shuffled[i]);
    
    // Fisher-Yates shuffle
    for (let i = groupBeats.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [groupBeats[i], groupBeats[j]] = [groupBeats[j], groupBeats[i]];
    }
    
    // Put shuffled beats back
    indices.forEach((originalIndex, i) => {
      shuffled[originalIndex] = groupBeats[i];
    });
  }
  
  return shuffled;
}

/**
 * Execute a parsed pattern on audio data with a beatmap
 */
export function executePattern(
  audio: AudioData,
  beatmap: number[],
  pattern: string,
  scale: number = 1,
  shift: number = 0,
  options: {
    limitBeats?: number;
    limitLength?: number;
    smoothing?: number;
  } = {}
): { left: Float32Array; right: Float32Array } {
  const { limitBeats = 10000, limitLength = 52920000, smoothing = 100 } = options;
  
  // Handle special patterns
  const patternLower = pattern.toLowerCase().trim();
  
  // Reverse pattern
  if (patternLower === 'reverse') {
    return {
      left: audio.leftChannel.slice().reverse(),
      right: audio.rightChannel.slice().reverse(),
    };
  }
  
  // Shuffle pattern
  if (patternLower === 'shuffle') {
    const shuffledBeatmap = [...beatmap];
    // Fisher-Yates shuffle
    for (let i = shuffledBeatmap.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledBeatmap[i], shuffledBeatmap[j]] = [shuffledBeatmap[j], shuffledBeatmap[i]];
    }
    
    // Reconstruct audio with shuffled beats
    const segments: Array<{ left: Float32Array; right: Float32Array }> = [];
    for (let i = 0; i < shuffledBeatmap.length - 1 && segments.length < limitBeats; i++) {
      const start = shuffledBeatmap[i];
      const end = shuffledBeatmap[i + 1];
      segments.push(getAudioSlice(audio, start, end));
    }
    
    return concatenateSegments(segments);
  }
  
  // Random pattern
  if (patternLower === 'random') {
    pattern = generateRandomPattern();
  }
  
  // Test pattern (cowbell visualization - just play normally for web version)
  if (patternLower === 'test') {
    pattern = '1, 2, 3, 4, 5, 6, 7, 8';
  }
  
  // Apply scale and shift to beatmap
  let scaledBeatmap = scaleBeatmap(beatmap, scale);
  scaledBeatmap = shiftBeatmap(scaledBeatmap, shift);
  
  // Add end point if not present
  if (scaledBeatmap[scaledBeatmap.length - 1] < audio.leftChannel.length) {
    scaledBeatmap.push(audio.leftChannel.length);
  }
  
  // Parse the pattern
  const parsed = parsePattern(pattern);
  
  // Execute pattern
  const segments: Array<{ left: Float32Array; right: Float32Array }> = [];
  let n = 0;
  let totalLength = 0;
  let tries = 0;
  
  while (n * parsed.patternLength < scaledBeatmap.length - 1) {
    // Shuffle beats if there are shuffle groups
    let currentBeats = parsed.shuffleGroups.size > 0 
      ? shuffleBeatsInGroups(parsed.beats, parsed.shuffleGroups)
      : parsed.beats;
    
    for (let beatIdx = 0; beatIdx < currentBeats.length; beatIdx++) {
      // Check limits
      if (segments.length >= limitBeats) break;
      if (totalLength >= limitLength) break;
      
      const parsedBeat = currentBeats[beatIdx];
      
      // Skip if marked with !
      if (parsedBeat.skip) continue;
      
      try {
        let segment = getBeatSegment(
          audio, 
          scaledBeatmap, 
          parsedBeat, 
          n, 
          parsed.patternLength
        );
        
        if (!segment || segment.left.length === 0) continue;
        
        // Apply effects
        for (const [effectType, value] of parsedBeat.effects) {
          segment = applyEffect(segment, effectType, value);
        }
        
        // Apply reverse if flagged
        if (parsedBeat.reverse) {
          segment = {
            left: segment.left.slice().reverse(),
            right: segment.right.slice().reverse(),
          };
        }
        
        // Clip to -1, 1
        segment = {
          left: clipAudio(segment.left),
          right: clipAudio(segment.right),
        };
        
        // Handle operator (how to combine with previous segment)
        const operator = parsed.operators[beatIdx + 1] || ',';
        
        if (operator === ',' || segments.length === 0) {
          // Append
          segments.push(segment);
        } else if (operator === ';' && segments.length > 0) {
          // Mix with first length
          segments[segments.length - 1] = mixSegments(
            segments[segments.length - 1],
            segment,
            'first'
          );
        } else if (operator === '~' && segments.length > 0) {
          // Mix with shortest length
          segments[segments.length - 1] = mixSegments(
            segments[segments.length - 1],
            segment,
            'shortest'
          );
        } else if (operator === '&' && segments.length > 0) {
          // Mix with longest length
          segments[segments.length - 1] = mixSegments(
            segments[segments.length - 1],
            segment,
            'longest'
          );
        } else {
          segments.push(segment);
        }
        
        totalLength += segment.left.length;
        
      } catch (e) {
        tries++;
        if (tries > 30) break;
      }
    }
    
    n++;
    if (tries > 30) break;
  }
  
  // Apply smoothing at segment boundaries
  const result = concatenateSegments(segments);
  
  if (smoothing > 0) {
    applySmoothing(result, smoothing);
  }
  
  return result;
}

/**
 * Get a beat segment from audio based on parsed beat
 */
function getBeatSegment(
  audio: AudioData,
  beatmap: number[],
  parsedBeat: ParsedBeat,
  loopN: number,
  patternLength: number
): { left: Float32Array; right: Float32Array } {
  const getBeatPosition = (beatNum: number): number => {
    const adjustedBeat = beatNum + patternLength * loopN;
    const beatIndex = Math.floor(adjustedBeat);
    const beatFraction = adjustedBeat % 1;
    
    if (beatIndex < 0 || beatIndex >= beatmap.length) {
      return -1;
    }
    
    if (beatFraction === 0) {
      return beatmap[beatIndex];
    }
    
    // Interpolate between beats
    const nextIndex = Math.min(beatIndex + 1, beatmap.length - 1);
    const start = beatmap[beatIndex];
    const end = beatmap[nextIndex];
    return Math.floor(start + beatFraction * (end - start));
  };
  
  let startPos: number;
  let endPos: number;
  let reverse = false;
  
  if (typeof parsedBeat.beat === 'number') {
    // Single beat
    const beatNum = parsedBeat.beat;
    const beatIndex = Math.floor(beatNum) + patternLength * loopN;
    
    if (beatIndex < 0 || beatIndex >= beatmap.length - 1) {
      return { left: new Float32Array(0), right: new Float32Array(0) };
    }
    
    startPos = getBeatPosition(beatNum - 1);
    endPos = getBeatPosition(beatNum);
    
    if (startPos < 0) startPos = 0;
    if (endPos < 0) endPos = audio.leftChannel.length;
    
  } else {
    // Range of beats
    const { start, end, sliceType } = parsedBeat.beat;
    
    if (sliceType === ':') {
      // Range: start:end
      startPos = getBeatPosition(start);
      endPos = getBeatPosition(end);
    } else if (sliceType === '>') {
      // First portion: beat>fraction
      const beatPos = getBeatPosition(start - 1);
      const nextBeatPos = getBeatPosition(start);
      if (beatPos < 0 || nextBeatPos < 0) {
        return { left: new Float32Array(0), right: new Float32Array(0) };
      }
      const beatLength = nextBeatPos - beatPos;
      startPos = beatPos;
      endPos = beatPos + Math.floor(beatLength * end);
    } else if (sliceType === '<') {
      // Last portion: beat<fraction
      const beatPos = getBeatPosition(start - 1);
      const nextBeatPos = getBeatPosition(start);
      if (beatPos < 0 || nextBeatPos < 0) {
        return { left: new Float32Array(0), right: new Float32Array(0) };
      }
      const beatLength = nextBeatPos - beatPos;
      startPos = nextBeatPos - Math.floor(beatLength * end);
      endPos = nextBeatPos;
    } else {
      return { left: new Float32Array(0), right: new Float32Array(0) };
    }
    
    if (startPos < 0) startPos = 0;
    if (endPos < 0) endPos = audio.leftChannel.length;
  }
  
  // Handle reversed range
  if (startPos > endPos) {
    [startPos, endPos] = [endPos, startPos];
    reverse = true;
  }
  
  return getAudioSlice(audio, startPos, endPos, reverse);
}

/**
 * Scale beatmap
 */
function scaleBeatmap(beatmap: number[], scale: number): number[] {
  if (scale === 1) return [...beatmap];
  
  const scaled: number[] = [];
  let a = 0;
  
  while (a + 1 < beatmap.length) {
    const floorA = Math.floor(a);
    const ceilA = Math.min(floorA + 1, beatmap.length - 1);
    const frac = a - floorA;
    
    const interpolated = Math.floor(
      (1 - frac) * beatmap[floorA] + frac * beatmap[ceilA]
    );
    scaled.push(interpolated);
    
    a += scale;
  }
  
  return scaled;
}

/**
 * Shift beatmap
 */
function shiftBeatmap(beatmap: number[], shift: number): number[] {
  if (shift === 0) return beatmap;
  
  const shifted = [...beatmap];
  
  if (shift > 0) {
    // Positive shift - remove beats from beginning
    const fullBeats = Math.floor(shift);
    const fraction = shift % 1;
    
    if (fullBeats > 0 && fullBeats < shifted.length) {
      shifted.splice(0, fullBeats);
    }
    
    if (fraction !== 0 && shifted.length > 1) {
      for (let i = 0; i < shifted.length - 1; i++) {
        shifted[i] = Math.floor(
          shifted[i] + fraction * (shifted[i + 1] - shifted[i])
        );
      }
    }
  } else {
    // Negative shift - insert beats at beginning
    const absShift = -shift;
    const fullBeats = Math.floor(absShift);
    const fraction = absShift % 1;
    
    if (fullBeats >= 1 && shifted.length >= 2) {
      const step = Math.floor((shifted[1] - shifted[0]) / (fullBeats + 1));
      const newBeats: number[] = [];
      for (let i = 0; i < fullBeats; i++) {
        newBeats.push(shifted[0] + step * (i + 1) - step);
      }
      shifted.splice(1, 0, ...newBeats);
    }
    
    if (fraction !== 0) {
      for (let i = shifted.length - 1; i > 0; i--) {
        shifted[i] = Math.floor(
          shifted[i] - fraction * (shifted[i] - shifted[i - 1])
        );
      }
    }
  }
  
  return shifted;
}

/**
 * Apply smoothing at segment boundaries to reduce clicks
 */
function applySmoothing(
  audio: { left: Float32Array; right: Float32Array },
  samples: number
): void {
  const fadeLength = Math.min(samples, audio.left.length / 2);
  
  // Fade in
  for (let i = 0; i < fadeLength; i++) {
    const factor = i / fadeLength;
    audio.left[i] *= factor;
    audio.right[i] *= factor;
  }
  
  // Fade out
  const startFadeOut = audio.left.length - fadeLength;
  for (let i = 0; i < fadeLength; i++) {
    const factor = (fadeLength - i) / fadeLength;
    audio.left[startFadeOut + i] *= factor;
    audio.right[startFadeOut + i] *= factor;
  }
}

/**
 * Pattern Presets for BeatShuffle
 * Complete implementation of all pattern presets from the original beatshuffle project
 */

export interface Preset {
  pattern: string;
  scales: number[];
  shift?: number;
  description?: string;
  category: PresetCategory;
}

export type PresetCategory = 
  | 'basic' 
  | 'structures' 
  | 'time-signatures' 
  | 'genres' 
  | 'effects' 
  | 'songs' 
  | 'other';

export const PRESET_CATEGORIES: { id: PresetCategory; label: string }[] = [
  { id: 'basic', label: 'Basic' },
  { id: 'structures', label: 'Structures' },
  { id: 'time-signatures', label: 'Time Signatures' },
  { id: 'genres', label: 'Genres' },
  { id: 'effects', label: 'Effects' },
  { id: 'songs', label: 'Songs' },
  { id: 'other', label: 'Other' },
];

export const PRESETS: Record<string, Preset> = {
  // ________________ BASIC ________________
  '2x speed': {
    pattern: '1>0.5',
    scales: [1, 0.5, 1/3, 0.25],
    category: 'basic',
  },
  '3x speed': {
    pattern: '1>1/3',
    scales: [1, 0.5],
    category: 'basic',
  },
  '4x speed': {
    pattern: '1>0.25',
    scales: [1, 0.5],
    category: 'basic',
  },
  '6x speed': {
    pattern: '1>1/6',
    scales: [1, 0.5],
    category: 'basic',
  },
  '8x speed': {
    pattern: '1>0.125',
    scales: [1, 0.5],
    category: 'basic',
  },
  '1.33x faster': {
    pattern: '1>0.75',
    scales: [1, 2/3, 0.5, 1/3, 0.25],
    category: 'basic',
  },
  '1.5x faster': {
    pattern: '1>2/3',
    scales: [1, 2/3],
    category: 'basic',
  },
  '1.5x slower': {
    pattern: '1>0.5, 1<0.5r, 1<0.5',
    scales: [2, 1, 0.75, 0.5],
    category: 'basic',
  },
  '1.33x slower': {
    pattern: '1>2/3, 1<1/3r, 1<1/3',
    scales: [2, 1],
    category: 'basic',
  },
  'reverse': {
    pattern: 'reverse',
    scales: [8, 4, 2, 1, 0.5, 1/3, 0.25, 0.2, 1/7, 0.125],
    category: 'basic',
  },
  'reverse 8 beats': {
    pattern: '8, 7, 6, 5, 4, 3, 2, 1',
    scales: [1, 0.5],
    category: 'basic',
  },
  'shuffle': {
    pattern: 'shuffle',
    scales: [1],
    category: 'basic',
  },
  'shuffle 3 beats': {
    pattern: '1#1, 2#1, 3#1',
    scales: [2, 1, 0.75, 0.5, 0.25, 0.2, 0.125],
    category: 'basic',
  },
  'shuffle 4 beats': {
    pattern: '1#1, 2#1, 3#1, 4#1',
    scales: [2, 1, 0.75, 0.5, 0.25, 0.125],
    category: 'basic',
  },
  'shuffle 8 beats': {
    pattern: '1#1, 2#1, 3#1, 4#1, 5#1, 6#1, 7#1, 8#1',
    scales: [2, 1, 0.75, 0.5, 0.25],
    category: 'basic',
  },
  'shuffle alternate': {
    pattern: '1#1, 2#2, 3#1, 4#2, 5#1, 6#2, 7#1, 8#2',
    scales: [1, 0.125],
    category: 'basic',
  },
  'shuffle mix': {
    pattern: 'i#1, i#2, i#3, i#4, i#1, i#2, i#3, i#4, i#1, i#2, i#3, i#4, i#1, i#2, i#3, i#4',
    scales: [1, 0.5],
    category: 'basic',
  },
  '3 bars mix': {
    pattern: 'i, i+4?, i+8?, 3!',
    scales: [1, 0.5, 1/3],
    category: 'basic',
  },
  '4 bars mix': {
    pattern: 'i, i+4?, i+8?, i+12?, 4!',
    scales: [1, 0.5],
    category: 'basic',
  },
  '6 bars mix': {
    pattern: 'i, i+4?, i+8?, i+12?, i+16?, i+20?, 6!',
    scales: [1, 0.5],
    category: 'basic',
  },
  '8 bars mix': {
    pattern: 'i, i+4?, i+8?, i+12?, i+16?, i+20?, i+24?, i+28?, 8!',
    scales: [1, 0.5],
    category: 'basic',
  },
  '2 in 1': {
    pattern: '1; 2',
    scales: [8, 6, 4, 3, 2, 1, 0.5, 0.25],
    category: 'basic',
  },
  '3 in 1': {
    pattern: '1; 2; 3',
    scales: [4, 3, 1],
    category: 'basic',
  },
  '4 in 1': {
    pattern: '1; 2; 3; 4',
    scales: [4, 1],
    category: 'basic',
  },
  '5 in 1': {
    pattern: '1;2;3;4;5',
    scales: [2, 1],
    category: 'basic',
  },
  '2 in 1 reverse': {
    pattern: '1;2r?',
    scales: [8, 3, 1, 0.75, 0.5, 0.25, 0.125],
    category: 'basic',
  },
  'reverse mix': {
    pattern: '1;1r',
    scales: [4, 1, 0.75, 0.5],
    category: 'basic',
  },
  'random': {
    pattern: 'random',
    scales: [2, 1, 0.5, 0.25, 0.125],
    description: 'generates a new random pattern each time',
    category: 'basic',
  },
  'kicks only': {
    pattern: '1>0.5',
    scales: [2],
    description: 'plays only kicks',
    category: 'basic',
  },
  'kicks only double-time': {
    pattern: '1>0.25',
    scales: [2],
    description: 'plays only kicks',
    category: 'basic',
  },
  'snares only': {
    pattern: '1<0.5',
    scales: [2],
    description: 'plays only snares',
    category: 'basic',
  },
  'no main drums': {
    pattern: '1<0.5',
    scales: [1, 0.5, 0.25, 0.125],
    description: 'skips kicks and snares',
    category: 'basic',
  },
  
  // ________________ STRUCTURES ________________
  'half-time': {
    pattern: '1,2,4,5, | 3,6,8,7, | 9,11,12,13, | 15,13,14,16',
    scales: [1, 0.5],
    description: 'halves the BPM',
    category: 'structures',
  },
  'quarter-time 1': {
    pattern: '1,2,4,5,|6,8,9,10,|11,12,13,14,|16,14,15,16',
    scales: [0.5],
    description: '4 times lower BPM',
    category: 'structures',
  },
  'quarter-time 2': {
    pattern: '1,2,4,5, | 6,8,10,12, | 11,10,12,13, | 9,13,14,16',
    scales: [0.5],
    description: '4 times lower BPM, with a syncopated structure',
    category: 'structures',
  },
  'dotted snares 1': {
    pattern: '1, 2>0.5, 3, 4>0.5, 5, 6>0.5, 3, 4>0.5, 7, 8',
    scales: [2, 1],
    description: 'Plays 5 snares in a 4/3 syncopation, a rhythm commonly used in drum&bass',
    category: 'structures',
  },
  'dotted snares 2': {
    pattern: '1, 2, 3 , 4, | 5, 7 , 6, 8, | 11 , 10, 9, 11 , | 13, 14, 15 , 16',
    scales: [0.5],
    description: 'Plays 5 snares in a 4/3 syncopation, a rhythm commonly used in drum&bass. This one only swaps snares and preserves the original rhythm better.',
    category: 'structures',
  },
  'dotted snares 2 long': {
    pattern: '1, 2, 3 , 4, | 5, 7 , 6, 8, | 11 , 10, 9, 11 , | 13, 14, 15 , 16, | 17, 19 , 18, 20, | 23 , 22, 21, 23 , | 25, 26, 27 , 28, | 29, 31 , 30, 32',
    scales: [0.5],
    description: 'Plays 10 snares in a long 4/3 syncopation, a rhythm commonly used in drum&bass/darkstep.',
    category: 'structures',
  },
  'dotted snares 2 longer': {
    pattern: '1, 2, 3 , 4, | 5, 7 , 6, 8, | 11 , 10, 9, 11 , | 13, 14, 15 , 16, | 17, 19 , 18, 20, | 23 , 22, 21, 23 , | 25, 26, 27 , 28, | 29, 31 , 30, 32',
    scales: [0.5],
    description: 'Plays 20 snares in a very long 4/3 syncopation to create a rolling, jazzy feel.',
    category: 'structures',
  },
  'dotted snares fast 1': {
    pattern: '1, 2, 3, 5>0.5, 7, 5>0.5, 11, 5>0.5, 7, 5>0.5, 11, 9>0.5, 7, 9>0.5, 11, 9>0.5, 7, 9>0.5, 11, 16',
    scales: [0.5],
    description: 'Plays 10 snares in a fast 4/3 syncopation, a rhythm commonly used in drum&bass',
    category: 'structures',
  },
  'dotted snares fast 2': {
    pattern: '1, 2>0.75,   2>0.25, 1.25:1.75;3, 4>0.75, 4>0.75, 4>0.75, 4>0.25, 3.25:3.75;5, 6>0.75, 6>0.75;7, 8>0.75, 6>0.25;8<0.25',
    scales: [1],
    description: 'Plays 10 snares in a fast 4/3 syncopation, a rhythm commonly used in drum&bass',
    category: 'structures',
  },
  'dotted kicks': {
    pattern: '1>0.75, 1>0.25, 2>0.5, 1>0.75, 1>0.75, 4>0.75, 1>0.75, 1>0.5, 6>0.25, 1>0.75, 1>0.75, 1>0.25, 8>0.5, 1>0.5',
    scales: [1],
    description: 'Plays the first beat in a 4/3 syncopation while preserving snare beats.',
    category: 'structures',
  },
  'dotted kicks 2': {
    pattern: '0:0.75, 0.75:1.5;0:0.75, 1.5:2.25;0:0.75, 2.25:3;0:0.75, 3:3.75;0:0.75, 3.75:4.5;0:0.75, 4.5:5.25;0:0.75, 5.25:6;0:0.75, 6:6.75;0:0.75, 6.75:7.5;0:0.75, 7.5:8;0:0.5',
    scales: [1],
    description: 'Plays a 4/3 syncopated first beat on top of normal beats.',
    category: 'structures',
  },
  'tripple dotted': {
    pattern: '1>0.375, 1>0.375, 1>0.25',
    scales: [8, 4, 2, 1, 0.5],
    description: 'Each beat turns into three 4/3 syncopated notes. Can be somewhat similar to footwork.',
    category: 'structures',
  },
  'tripple dotted snares': {
    pattern: '1>0.375, 1>0.375, 1>0.25',
    scales: [8, 4, 2],
    shift: 1,
    description: 'plays only the snare beats in three 4/3 syncopated notes, a rhythm used in drum&bass/jungle.',
    category: 'structures',
  },
  'dotted structure': {
    pattern: '1>0.75, 2>0.75, 4>0.5',
    scales: [4, 2, 1],
    description: 'plays the significant drum beats as three 4/3 syncopated notes. Similar to moombahton but without the second kick.',
    category: 'structures',
  },
  'dotted chaos 1': {
    pattern: '1>1/3',
    scales: [0.75],
    category: 'structures',
  },
  'dotted chaos 2': {
    pattern: '1>1/6',
    scales: [0.75],
    category: 'structures',
  },
  'dotted pattern 1': {
    pattern: '1, 2>0.75,   2>0.25, 1.25:1.75;3, 2>0.75, 2>0.75, 2>0.75, 2>0.25, 1.25:1.75;5, 2>0.75, 2>0.75;7, 2>0.75, 2>0.25;8<0.25',
    scales: [0.5],
    description: 'plays part between first kick and snare in a 4/3 syncopation, with original drums on top.',
    category: 'structures',
  },
  'dotted pattern 2': {
    pattern: '1, 2>0.75,   2>0.25, 1.25:1.75;3, 4>0.75, 4>0.75, 4>0.75, 4>0.25, 3.25:3.75;5, 6>0.75, 6>0.75;7, 8>0.75, 6>0.25;8<0.25',
    scales: [0.5],
    description: 'plays parts between each kick and snare in a 4/3 syncopation, with original drums on top.',
    category: 'structures',
  },
  
  // ________________ TIME SIGNATURES ________________
  '4-3': {
    pattern: '1>2/3, 2>2/3, 2>2/3',
    scales: [2, 1, 0.5],
    description: '4/3 time signature, preserves length',
    category: 'time-signatures',
  },
  '3-4': {
    pattern: '1>0.75',
    scales: [8, 4, 3, 2],
    description: 'plays 3 beats out of each 4, creating 3/4 time signature',
    category: 'time-signatures',
  },
  '4-7 1': {
    pattern: '1, 2, 3, 4>0.5',
    scales: [2, 1, 0.5, 0.25, 0.125],
    description: 'cuts 4th beat in half, creating 4/7 time signature',
    category: 'time-signatures',
  },
  '4-7 2': {
    pattern: '1, 2, 3, 4>0.25, 3.75:4, 5,6>0.5, 7, 8',
    scales: [2, 1, 0.5, 0.25, 0.125],
    description: 'alternates between cutting 2nd and 4th beats in half, creating a natural 4/7 time signature',
    category: 'time-signatures',
  },
  '4-13': {
    pattern: '1, 2, 3, 4>0.25',
    scales: [4, 2, 1, 0.5],
    description: 'abruptly stops on quarter of the 4th beat, creating 4/13 time signature',
    category: 'time-signatures',
  },
  
  // ________________ GENRES ________________
  'moombahton': {
    pattern: '1>0.75, 2>0.25, 1>0.5, 4>0.5',
    scales: [3, 2, 1],
    description: 'a distinct popular moombathon/dutch house rhythm.',
    category: 'genres',
  },
  'four-on-the-floor 1': {
    pattern: '1, 2, 1, 4, 1, 6, 1, 8, 1, 10, 1, 12, 1, 14, 1, 16',
    scales: [0.5],
    description: 'replaces snares with kicks',
    category: 'genres',
  },
  'four-on-the-floor 1 double-time': {
    pattern: '1, 2, 1, 4, 1, 6, 1, 8, 1, 10, 1, 12, 1, 14, 1, 16, 1, 18, 1, 20, 1, 22, 1, 24, 1, 26, 1, 28, 1, 30, 1, 32',
    scales: [0.25],
    description: 'replaces snares with kicks',
    category: 'genres',
  },
  'house 1': {
    pattern: '1, 2, 3, 4, 1, 6, 7, 8, 1, 10, 11, 12, 1, 14, 15, 16',
    scales: [0.5],
    category: 'genres',
  },
  'house 1 double-time': {
    pattern: '1, 2, 5, 4, 1, 6, 5, 8, 1, 10, 13, 12, 1, 14, 13, 16, 1, 18, 21, 20, 1, 22, 21, 24, 1, 26, 29, 28, 1, 30, 29, 32',
    scales: [0.25],
    category: 'genres',
  },
  'house 2': {
    pattern: '1>0.5',
    scales: [4],
    category: 'genres',
  },
  'house 2 double-time': {
    pattern: '1>0.25',
    scales: [4],
    category: 'genres',
  },
  'drill': {
    pattern: '1>0.75, 2>0.75, 2>0.5,  3>0.75, 4>0.75, 4>0.5,  5>0.75, 6>0.75, 6>0.5,  6, 7>0.75, 8<0.25',
    scales: [1, 0.5, 0.25],
    description: 'distinct drill rhythm with 4/3 syncopatied notes and a shifted second snare.',
    category: 'genres',
  },
  'jungle 1': {
    pattern: '1, 2, 3, 4, 5, 7, 6, 8, | 11, 10, 11, 12, 13, 15, 14, 16, | 19, 18, 19, 20, 21, 23, 22, 24, | 27, 26, 27, 28, 29, 31, 30, 32',
    scales: [1.5, 0.75, 0.5],
    description: 'Rhythm commonly used in jungle, otherwise sounds like a buildup snare pattern.',
    category: 'genres',
  },
  'jungle 2': {
    pattern: '1, 2, 1, 2, | 3>0.5, 3>0.5, 1>0.5, 7>0.5, | 7>0.5, 7>0.5, 5>0.5, 11>0.5, | 11>0.5, 7>0.5, 0>0.5, 11>0.5, |  14>0.5, 11>0.5, 13>0.5, 15>0.5, 16!',
    scales: [0.5],
    description: '4/3 syncopated snares with additional snare-rolls',
    category: 'genres',
  },
  'drumfunk': {
    pattern: '1, 2, 3 , 4, | 3 , 4, 9, 7 , | 8, 10, 11 , 0>0.5, 11>0.5 , | 0>0.5, 15>0.5, 14, 15 , 16',
    scales: [1, 0.5],
    description: 'pattern commonly used in drumfunk',
    category: 'genres',
  },
  'jazzy': {
    pattern: '1, 2>0.5, 3, 4>0.5, 5, 6>0.5, 3, 4>0.5, 7, 8',
    scales: [0.5, 0.25],
    description: 'seamlessly adds a 4/3 syncopation without disrupting the original rhythm',
    category: 'genres',
  },
  'darkstep': {
    pattern: '1,1,3,1, | 1,7,1,1, | 11,9,9,11, | 9,9,15,16',
    scales: [1, 0.5],
    category: 'genres',
  },
  'darkstep long': {
    pattern: '1,1,3,1, | 1,7,1,1, | 11,9,9,11, | 9,9,15,9, | 17,19,17,17, | 19,17,17,23, | 25,25,27,25, | 25,31,25,32',
    scales: [0.5],
    category: 'genres',
  },
  'darkstep fast': {
    pattern: '1,1,5,1, | 1,13,1,1, | 21,17,17,21, | 17,17,29,32',
    scales: [0.25],
    category: 'genres',
  },
  
  // ________________ EFFECTS ________________
  'staccato reverese': {
    pattern: '1>0.5, 0.5:0.8r, 0.5:0.8, 0.5:0.8r, 0.5:0.8, 0.5:0.8r, 3>0.6, 0.5:0.8r, 0.5:0.8, 0.5:0.8r, 0.5:0.8, 0.5:0.7r, 5>0.5, 0.5:0.8r, 0.5:0.8, 0.5:0.8r, 0.5:0.8, 0.5:0.8r, 7>0.6, 0.5:0.8r, 0.5:0.8, 0.5:0.8r, 7.6:7.9, 7.0>0',
    scales: [0.5, 0.25],
    category: 'effects',
  },
  'staccato reverese syncopated 1': {
    pattern: '1, 2>0.5, 2.5:4r, 2.5:4, 2.5:4r, 2.5:4, 2.5:3r, | 9, 10.5:12, 10.5:12r, 10.5:12, 10.5:12r, 10.5:11.5, | 16:16.5, 18.5:20r, 18.5:20, 18.5:20r, 18.5:20, 18.5:20r, | 25, 25:25.5, 26.5:28r, 26.5:28, 26.5:28r, 26.5:28, 31.5:32',
    scales: [1/8, 1/16],
    category: 'effects',
  },
  'staccato reverese syncopated 2': {
    pattern: '1, 2>0.5, 2.5:4r, 2.5:4, 2.5:4r, 2.5:4, 2.5:3r, | 9, 2.5:4, 2.5:4r, 2.5:4, 2.5:4r, 2.5:3.5, | 16:16.5, 2.5:4r, 2.5:4, 2.5:4r, 2.5:4, 2.5:4r, | 25, 25:25.5, 2.5:4r, 2.5:4, 2.5:4r, 2.5:4, 31.5:32',
    scales: [1/8, 1/16],
    category: 'effects',
  },
  'staccato reverese syncopated 3': {
    pattern: '1, 2>0.5, 2.5:4s2,2.5:4s2r, 2.5:4, 2.5:4r,  2.5:4s2,2.5:4s2r, 2.5:3, | 9, 2.5:4r, 2.5:4s2,2.5:4s2r, 2.5:4, 2.5:4r,  2.5:4s2,2.5:4s2r, | 16:17.5, 2.5:4r, 2.5:4s2,2.5:4s2r, 2.5:4, 2.5:4r, | 24:25.5, 2.5:4, 2.5:4r,  2.5:4s2,2.5:4s2r, 2.5:4, 31.5:32r',
    scales: [1/8, 1/16],
    category: 'effects',
  },
  
  // ________________ SONGS ________________
  'BS6': {
    pattern: '1, 1, | 3>1.5, 3>1.5, 3>1.5, 3>1.5, | 9, 9>0.5 | 14.5>1.5, 14.5>1.5, 14.5>1.5, 14.5>1.5, 14.5>0.5, 16!',
    scales: [1, 0.5],
    description: 'Hyroglifics & Sinistarr - BS6',
    category: 'songs',
  },
  'Poison': {
    pattern: '0:1/3, 0:1/3, 1:4/3, 1:4/3, 2:7/3, 2:7/3, 3:10/3, 3:10/3, 1/3:2/3, 4/3:5/3, 10/3:4',
    scales: [1],
    description: 'Stray & Halogenix - Poison',
    category: 'songs',
  },
  'Szamar Madar': {
    pattern: '1, 2, 3, 4, 4, 1, 2, 3, 1, 1v0, 1v0, 1, 7, 8,|9, 10, 11, 12, 13, 14, 15, 16, 15, 10, 10, 10, 11, 16,|17, 18, 19, 20, 20, 17, 18, 19, 20, 20, 17, 17v0, 23, 24,|25, 25:25.5, 24:24.5, 27, 25, 28, 25, 31, 24:24.5, 27.5:28, 24:24.5, 27.5:28, 25, 25, 25, 31, 32',
    scales: [0.5],
    description: 'Venetian Snares - Szamar Madar (11/4)',
    category: 'songs',
  },
  'Conceivability': {
    pattern: '1, 2, 3, 4, 9, 10, 11, 12, 13, 14, 16<0.5, 16>0.5, | 17, 18, 19>0.5, 20, 21, 21<0.5, 22, 23, 23<0.5, 24, 30, 31, 32>0.5',
    scales: [1],
    category: 'songs',
  },
  'Rhythm Era': {
    pattern: '1, 2>0.75, 2>0.75, 2>0.75, 2>0.25, | 5, 6>0.75, 8>0.75, 6>0.75, 8>0.25, | 9, 10>0.75, 10>0.75, 10>0.75, 10>0.25, | 13, 14>0.75v0.6; 16>0.75v0.6, 14>0.75, 14>0.5, 14>0.5v0.6; 16>0.5v0.6',
    scales: [1],
    description: 'stunlocked - Rhythm Era (7/4)',
    category: 'songs',
  },
  
  // ________________ OTHER ________________
  'test': {
    pattern: 'test',
    scales: [1],
    description: 'puts cowbells on beats',
    category: 'other',
  },
};

/**
 * Get all preset names
 */
export function getPresetNames(): string[] {
  return Object.keys(PRESETS);
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: PresetCategory): string[] {
  return Object.entries(PRESETS)
    .filter(([, preset]) => preset.category === category)
    .map(([name]) => name);
}

/**
 * Get a preset by name
 */
export function getPreset(name: string): Preset | undefined {
  return PRESETS[name];
}

/**
 * Format scale for display (fractions like 1/3)
 */
export function formatScale(scale: number): string {
  // Common fractions
  const fractions: Record<number, string> = {
    [1/3]: '1/3',
    [2/3]: '2/3',
    [1/6]: '1/6',
    [1/7]: '1/7',
    [1/8]: '1/8',
    [1/16]: '1/16',
  };
  
  if (fractions[scale]) return fractions[scale];
  
  // Check if it's a simple fraction
  if (scale < 1 && scale > 0) {
    for (let denom = 2; denom <= 16; denom++) {
      const numer = scale * denom;
      if (Math.abs(numer - Math.round(numer)) < 0.001) {
        return `${Math.round(numer)}/${denom}`;
      }
    }
  }
  
  // Round to reasonable precision
  if (scale === Math.floor(scale)) {
    return scale.toString();
  }
  
  return scale.toFixed(3).replace(/\.?0+$/, '');
}

/**
 * Generate a random pattern (implementation of the random preset)
 */
export function generateRandomPattern(): string {
  let pattern = '';
  let randLength = 0;
  let limit = 100;
  
  const sliceChoices = ['', '>0.5', '>0.25', '<0.5', '<0.25', '<1/3', '<2/3', '>1/3', '>2/3', '<0.75', '>0.75'];
  const sliceWeights = [13, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  
  const effectChoices = ['', 's0.5', 's2', 'r', 'v0.5', 'v2', 'v0', 'g', 'c', 'c0', 'c1'];
  const effectWeights = [30, 2, 2, 2, 1, 1, 2, 1, 2, 2, 2];
  
  const joinChoices = [', ', ';'];
  const joinWeights = [5, 1];
  
  const weightedChoice = <T>(choices: T[], weights: number[]): T => {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < choices.length; i++) {
      random -= weights[i];
      if (random <= 0) return choices[i];
    }
    return choices[choices.length - 1];
  };
  
  while (limit > 0) {
    limit--;
    
    // Random beat number (triangular distribution)
    let randNum = Math.floor(triangularRandom(1, 16, Math.max(1, randLength - 1)));
    if (Math.random() * randNum > randLength) {
      randNum = randLength + 1;
    }
    
    const randSlice = weightedChoice(sliceChoices, sliceWeights);
    const randEffect = weightedChoice(effectChoices, effectWeights);
    const randJoin = weightedChoice(joinChoices, joinWeights);
    
    pattern += `${randNum}${randSlice}${randEffect}${randJoin}`;
    
    if (randJoin === ', ') {
      randLength++;
    }
    
    if ([4, 8, 16].includes(randLength)) {
      if (Math.random() * 16 > 14) break;
    } else {
      if (Math.random() * 16 > 15.5) break;
    }
  }
  
  // Remove trailing separator
  pattern = pattern.replace(/[,;]\s*$/, '');
  
  return pattern;
}

/**
 * Triangular distribution random number
 */
function triangularRandom(min: number, max: number, mode: number): number {
  const u = Math.random();
  const fc = (mode - min) / (max - min);
  
  if (u < fc) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  } else {
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }
}

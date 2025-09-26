/**
 * A JavaScript port of the core beat-swapping and manipulation logic.
 */

// --- 1. Pattern Parsing ---

function parsePattern(patternString) {
    const regex = /([\w@\.<>\-_\*\/]+)?([a-zA-Z][\w\.\d,()\-]*)*([,;~&\^\$\}\s]*)/g;
    const pattern = [];
    const operators = [];
    let lastOperator = ',';

    for (const match of patternString.matchAll(regex)) {
        if (!match[0].trim()) continue;

        const beatDef = match[1] || '1';
        const effects = match[2] || '';
        const operator = (match[3] && match[3].trim()) ? match[3].trim() : ',';

        const parsedEffects = [];
        const effectRegex = /([a-zA-Z])([\d\.\-]+)*/g;
        for (const effectMatch of effects.matchAll(effectRegex)) {
            parsedEffects.push({
                type: effectMatch[1],
                value: parseFloat(effectMatch[2]) || null,
            });
        }

        pattern.push({ beatDef, effects });
        operators.push(lastOperator);
        lastOperator = operator;
    }
    return { pattern, operators };
}

// --- 2. Audio Effects ---

function applyEffects(left, right, effects) {
    let newLeft = left.slice();
    let newRight = right.slice();

    for (const effect of effects) {
        switch (effect.type) {
            case 'r': // Reverse
                newLeft.reverse();
                newRight.reverse();
                break;
            case 'v': // Volume
                const volume = effect.value !== null ? effect.value : 0.5;
                for (let i = 0; i < newLeft.length; i++) {
                    newLeft[i] *= volume;
                    newRight[i] *= volume;
                }
                break;
            case 's': // Speed (implemented via resampling)
                // A proper implementation requires resampling, which is complex.
                // We will simulate this by simply truncating or repeating the sample.
                const speed = effect.value !== null ? Math.max(0.1, effect.value) : 2.0;
                const newLen = Math.floor(newLeft.length / speed);
                const resampledL = new Float32Array(newLen);
                const resampledR = new Float32Array(newLen);
                for(let i = 0; i < newLen; i++) {
                    const oldIndex = Math.floor(i * speed);
                    if (oldIndex < newLeft.length) {
                        resampledL[i] = newLeft[oldIndex];
                        resampledR[i] = newRight[oldIndex];
                    }
                }
                newLeft = resampledL;
                newRight = resampledR;
                break;
        }
    }
    return { left: newLeft, right: newRight };
}

// --- 3. Beat & Slice Selection ---

/**
 * Gets a chunk of audio based on a beat definition string.
 * @param {string} beatDef - The definition (e.g., "1", "1>0.5", "2-4", "@").
 * @param {object} audioData - The full audio data.
 * @param {Array<number>} beatmap - The song's beatmap.
 * @param {number} patternOffset - The current repetition of the pattern.
 * @param {number} patternLength - The length of the pattern.
 * @returns {{left: Float32Array, right: Float32Array}|null}
 */
function getAudioChunk(beatDef, audioData, beatmap, patternOffset, patternLength) {
    const { leftChannel, rightChannel } = audioData;

    // Handle random beat
    if (beatDef.includes('@')) {
        const randIndex = Math.floor(Math.random() * (beatmap.length - 1));
        const startSample = beatmap[randIndex];
        const endSample = beatmap[randIndex + 1] || leftChannel.length;
        return {
            left: leftChannel.slice(startSample, endSample),
            right: rightChannel.slice(startSample, endSample)
        };
    }

    // Parse slices like ">0.5" or "<0.25"
    let sliceMatch = beatDef.match(/[><]([\d\.]+)/);
    let sliceType = sliceMatch ? sliceMatch[0][0] : null;
    let sliceVal = sliceMatch ? parseFloat(sliceMatch[1]) : null;
    const baseBeatNum = parseFloat(beatDef) || 1;

    const beatIndex = (baseBeatNum - 1) + patternOffset;
    if (beatIndex >= beatmap.length - 1) return null; // Out of beats

    let startSample = beatmap[beatIndex];
    let endSample = beatmap[beatIndex + 1] || leftChannel.length;
    const duration = endSample - startSample;

    if (sliceType === '>') {
        startSample = startSample + Math.floor(duration * sliceVal);
    } else if (sliceType === '<') {
        endSample = startSample + Math.floor(duration * sliceVal);
    }

    // TODO: Implement range parsing like "2-4"

    return {
        left: leftChannel.slice(startSample, endSample),
        right: rightChannel.slice(startSample, endSample)
    };
}


// --- 4. Main Manipulation Logic ---

export async function manipulate(audioData, beatmap, patternString) {
    self.postMessage({ type: 'status', payload: 'Parsing manipulation pattern...' });

    const { pattern, operators } = parsePattern(patternString);
    if (pattern.length === 0) return audioData; // Return original if pattern is empty

    const patternLength = pattern.length;
    const finalLeft = [audioData.leftChannel.slice(0, beatmap[0] || 0)];
    const finalRight = [audioData.rightChannel.slice(0, beatmap[0] || 0)];

    let n = 0; // Pattern repetition counter

    self.postMessage({ type: 'status', payload: 'Applying beat manipulations...' });

    while (true) {
        const patternOffset = n * patternLength;
        if (patternOffset >= beatmap.length) break;

        for (let i = 0; i < pattern.length; i++) {
            const currentBeatIndex = patternOffset + i;
            if (currentBeatIndex >= beatmap.length - 1) {
                break;
            }

            const op = pattern[i];
            const operator = operators[i];

            let chunk = getAudioChunk(op.beatDef, audioData, beatmap, patternOffset, patternLength);
            if (!chunk) continue;

            // Apply effects
            let { left: chunkLeft, right: chunkRight } = applyEffects(chunk.left, chunk.right, op.effects);

            // Apply join operators
            if (operator === ',') {
                finalLeft.push(chunkLeft);
                finalRight.push(chunkRight);
            } else if (operator === ';') {
                // Overlay/mix the chunk with the previous one
                const prevL = finalLeft.pop() || new Float32Array(0);
                const prevR = finalRight.pop() || new Float32Array(0);
                const maxLen = Math.max(prevL.length, chunkLeft.length);
                const newL = new Float32Array(maxLen);
                const newR = new Float32Array(maxLen);

                for (let j = 0; j < maxLen; j++) {
                    const pL = prevL[j] || 0;
                    const pR = prevR[j] || 0;
                    const cL = chunkLeft[j] || 0;
                    const cR = chunkRight[j] || 0;
                    newL[j] = pL + cL;
                    newR[j] = pR + cR;
                }
                finalLeft.push(newL);
                finalRight.push(newR);
            } else {
                // Default to concatenation for other operators for now
                finalLeft.push(chunkLeft);
                finalRight.push(chunkRight);
            }
        }
        n++;
    }

    // --- 5. Stitching it all together ---
    self.postMessage({ type: 'status', payload: 'Stitching final audio...' });

    const totalLength = finalLeft.reduce((sum, arr) => sum + arr.length, 0);
    const stitchedLeft = new Float32Array(totalLength);
    const stitchedRight = new Float32Array(totalLength);

    let offset = 0;
    for (let i = 0; i < finalLeft.length; i++) {
        stitchedLeft.set(finalLeft[i], offset);
        stitchedRight.set(finalRight[i], offset);
        offset += finalLeft[i].length;
    }

    // Clipping to prevent distortion
    for (let i = 0; i < totalLength; i++) {
        stitchedLeft[i] = Math.max(-1, Math.min(1, stitchedLeft[i]));
        stitchedRight[i] = Math.max(-1, Math.min(1, stitchedRight[i]));
    }

    return { leftChannel: stitchedLeft, rightChannel: stitchedRight };
}
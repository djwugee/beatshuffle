/**
 * Analyzes a novelty curve to find peaks, which correspond to onsets (beats).
 * @param {Float32Array} noveltyCurve - The curve calculated from spectral flux.
 * @param {number} hopSize - The hop size used to generate the curve (in samples).
 * @param {number} sampleRate - The sample rate of the original audio.
 * @returns {Array<number>} An array of beat times in seconds.
 */
export function findPeaks(noveltyCurve, hopSize, sampleRate) {
    self.postMessage({ type: 'status', payload: 'Finding peaks in novelty curve...' });

    // --- Configuration ---
    const meanWindowSize = 20; // How many frames to average for the dynamic threshold
    const waitFrames = 10;     // How many frames to wait after a peak before looking for another
    const preAvg = 10;         // Number of frames before the current one to include in local average
    const postAvg = 10;        // Number of frames after the current one to include in local average
    const delta = 0.1;         // A constant to add to the threshold

    const peaks = [];
    let wait = 0;

    for (let i = preAvg; i < noveltyCurve.length - postAvg; i++) {
        if (wait > 0) {
            wait--;
            continue;
        }

        // Is the current point a local maximum?
        let isMax = true;
        for (let j = -preAvg; j <= postAvg; j++) {
            if (noveltyCurve[i] < noveltyCurve[i + j]) {
                isMax = false;
                break;
            }
        }

        if (isMax) {
            // Calculate dynamic threshold based on the local average
            let sum = 0;
            for (let j = i - meanWindowSize; j < i + meanWindowSize; j++) {
                sum += noveltyCurve[j] || 0;
            }
            const threshold = (sum / (meanWindowSize * 2)) + delta;

            if (noveltyCurve[i] > threshold) {
                // Peak found! Convert frame index to time in seconds.
                const timeInSeconds = (i * hopSize) / sampleRate;
                peaks.push(timeInSeconds);
                wait = waitFrames; // Enforce refractory period
            }
        }
    }

    self.postMessage({ type: 'status', payload: `Found ${peaks.length} potential onsets.` });
    return peaks;
}

/**
 * Derives a beatmap from a list of onsets using autocorrelation.
 * This helps to find the main tempo and regularize the beat locations.
 * @param {Array<number>} onsets - An array of onset times in seconds.
 * @param {number} sampleRate - The sample rate of the original audio.
 * @returns {{beatmap: Array<number>, bpm: number}} The final beatmap in samples and the detected BPM.
 */
export function correlateOnsets(onsets, sampleRate) {
    if (onsets.length < 10) {
        // Not enough onsets to find a reliable tempo, return as is.
        return {
            beatmap: onsets.map(t => Math.floor(t * sampleRate)),
            bpm: 0
        };
    }

    self.postMessage({ type: 'status', payload: 'Correlating onsets to find tempo...' });

    // Create an onset function (a "dirac comb")
    const maxTime = onsets[onsets.length - 1];
    const resolution = 100; // 100 bins per second
    const onsetSignal = new Float32Array(Math.ceil(maxTime * resolution)).fill(0);
    for (const time of onsets) {
        onsetSignal[Math.floor(time * resolution)] = 1;
    }

    // Autocorrelation to find the dominant period (tempo)
    const minLag = Math.floor(resolution * 60 / 200); // Min BPM: 60
    const maxLag = Math.floor(resolution * 60 / 60);  // Max BPM: 200
    let bestLag = -1;
    let maxCorr = 0;

    for (let lag = minLag; lag < maxLag; lag++) {
        let correlation = 0;
        for (let i = 0; i < onsetSignal.length - lag; i++) {
            correlation += onsetSignal[i] * onsetSignal[i + lag];
        }
        if (correlation > maxCorr) {
            maxCorr = correlation;
            bestLag = lag;
        }
    }

    if (bestLag === -1) {
        return { beatmap: onsets.map(t => Math.floor(t * sampleRate)), bpm: 0 };
    }

    const bpm = (60 * resolution) / bestLag;
    const beatInterval = 60 / bpm;

    // Create a regular beat grid based on the detected tempo
    // Phase-align the grid with the strongest onsets
    let bestPhase = 0;
    let maxAlignment = -1;
    for (let i = 0; i < Math.floor(beatInterval * 100); i++) {
        const phase = i / 100;
        let alignment = 0;
        for (const onset of onsets) {
            const distance = Math.abs(onset - (Math.round((onset - phase) / beatInterval) * beatInterval + phase));
            if (distance < 0.05) { // 50ms tolerance
                alignment++;
            }
        }
        if (alignment > maxAlignment) {
            maxAlignment = alignment;
            bestPhase = phase;
        }
    }

    const beatmapTimes = [];
    for (let time = bestPhase; time < maxTime; time += beatInterval) {
        beatmapTimes.push(time);
    }

    self.postMessage({ type: 'status', payload: `Tempo found: ${bpm.toFixed(2)} BPM.` });

    return {
        beatmap: beatmapTimes.map(t => Math.floor(t * sampleRate)),
        bpm: bpm
    };
}
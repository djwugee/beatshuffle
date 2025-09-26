import { initializeWebGPU } from '../webgpu-helpers.js';
import { calculateOnsetNoveltyCurve } from './onset-detection.js';
import { calculateTempoByAutocorrelation } from './autocorrelation.js';
import { findPeaks, correlateOnsets } from './peak-picking.js';
import { manipulate } from '../beat-manipulator.js';

let webgpuDevice = null;

/**
 * The main beat detection function. It orchestrates multiple methods to find an accurate beatmap.
 */
async function detectBeats(leftChannel, rightChannel, sampleRate) {
    self.postMessage({ type: 'status', payload: 'Initializing WebGPU for beat detection...' });
    if (!webgpuDevice) {
        // Throws an error if initialization fails, which will be caught by the caller.
        const { device } = await initializeWebGPU();
        webgpuDevice = device;
    }

    const [noveltyCurve, tempoBPM] = await Promise.all([
        calculateOnsetNoveltyCurve(webgpuDevice, leftChannel, rightChannel, sampleRate),
        calculateTempoByAutocorrelation(webgpuDevice, leftChannel, rightChannel, sampleRate)
    ]);

    const hopSize = 512; // Must match the value in onset-detection.js
    const onsets = findPeaks(noveltyCurve, hopSize, sampleRate);

    if (tempoBPM === 0) {
        self.postMessage({ type: 'status', payload: 'Autocorrelation failed. Relying on onset correlation only.' });
        const { beatmap, bpm } = correlateOnsets(onsets, sampleRate);
        self.postMessage({ type: 'status', payload: `Final BPM: ${bpm.toFixed(2)}` });
        return beatmap;
    }

    self.postMessage({ type: 'status', payload: 'Refining onsets with global tempo...' });
    const beatIntervalSec = 60.0 / tempoBPM;
    const beatmap = [];

    let bestPhase = 0;
    let maxAlignment = -1;
    const phaseSteps = 20;
    for (let i = 0; i < phaseSteps; i++) {
        const phase = (i / phaseSteps) * beatIntervalSec;
        let alignment = 0;
        for (const onset of onsets) {
            const distance = Math.abs(onset - (Math.round((onset - phase) / beatIntervalSec) * beatIntervalSec + phase));
            if (distance < 0.025) {
                alignment++;
            }
        }
        if (alignment > maxAlignment) {
            maxAlignment = alignment;
            bestPhase = phase;
        }
    }

    const duration = leftChannel.length / sampleRate;
    for (let time = bestPhase; time < duration; time += beatIntervalSec) {
        beatmap.push(Math.floor(time * sampleRate));
    }

    self.postMessage({ type: 'status', payload: `Final BPM: ${tempoBPM.toFixed(2)}. Found ${beatmap.length} beats.` });
    return beatmap;
}


self.onmessage = async (e) => {
    const { type, payload } = e.data;

    if (type === 'start') {
        try {
            self.postMessage({ type: 'status', payload: 'Worker received decoded audio. Starting processing.' });

            const { leftChannel, rightChannel, sampleRate, pattern } = payload;

            // 1. Detect beats from the audio data using our new WebGPU pipeline.
            const beatmap = await detectBeats(leftChannel, rightChannel, sampleRate);

            // 2. Manipulate the audio using the pattern and the new beatmap.
            // This now calls the real manipulation logic.
            const {
                leftChannel: processedLeft,
                rightChannel: processedRight
            } = await manipulate({ leftChannel, rightChannel, sampleRate }, beatmap, pattern);

            // 3. Send the result back to the main thread.
            self.postMessage({
                type: 'result',
                payload: {
                    leftChannel: processedLeft,
                    rightChannel: processedRight,
                    sampleRate: sampleRate
                }
            }, [processedLeft.buffer, processedRight.buffer]);

        } catch (error) {
            console.error('Error in worker:', error);
            self.postMessage({ type: 'error', payload: error.message });
        }
    }
};

self.postMessage({ type: 'status', payload: 'Beat processor worker loaded and ready.' });
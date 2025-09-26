import { createGPUBuffer, createComputePipeline, executeComputePass, readGPUBuffer } from '../webgpu-helpers.js';

let envelopeShaderCode;
async function getShaderCode() {
    if (!envelopeShaderCode) {
        const response = await fetch('../shaders/envelope.wgsl');
        envelopeShaderCode = await response.text();
    }
    return envelopeShaderCode;
}

/**
 * Calculates the tempo of an audio signal using autocorrelation on its envelope.
 * @param {GPUDevice} device - The WebGPU device.
 * @param {Float32Array} leftChannel - The left channel of the audio data.
 * @param {Float32Array} rightChannel - The right channel of the audio data.
 * @param {number} sampleRate - The sample rate of the audio.
 * @returns {Promise<number>} A promise that resolves with the detected BPM.
 */
export async function calculateTempoByAutocorrelation(device, leftChannel, rightChannel, sampleRate) {
    self.postMessage({ type: 'status', payload: 'Starting autocorrelation tempo detection...' });

    // --- Configuration ---
    const downsampleFactor = 100;
    const envelopeWindowSize = 1024; // Samples for the moving average in the shader
    const workgroupSize = 256;

    // --- Preparation ---
    // 1. Mono mix the audio
    const monoSignal = new Float32Array(leftChannel.length);
    for (let i = 0; i < leftChannel.length; i++) {
        monoSignal[i] = (leftChannel[i] + rightChannel[i]) / 2;
    }

    // 2. Setup WebGPU resources for envelope calculation
    const shaderCode = await getShaderCode();
    const envelopePipeline = createComputePipeline(device, shaderCode, 'main', 'Envelope Pipeline');

    const inputBuffer = createGPUBuffer(device, GPUBufferUsage.STORAGE, monoSignal, 'Input Signal Buffer');
    const outputBuffer = createGPUBuffer(device, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, new Float32Array(monoSignal.length), 'Output Envelope Buffer');
    const paramsBuffer = createGPUBuffer(device, GPUBufferUsage.UNIFORM, new Uint32Array([envelopeWindowSize]), 'Envelope Params Buffer');

    // 3. Execute the envelope shader
    const workgroupCountX = Math.ceil(monoSignal.length / workgroupSize);
    executeComputePass(device, envelopePipeline, [inputBuffer, outputBuffer, paramsBuffer], workgroupCountX, 'Envelope Pass');

    // 4. Read back the envelope data
    const envelopeData = await readGPUBuffer(device, outputBuffer);
    const fullEnvelope = new Float32Array(envelopeData);

    inputBuffer.destroy();
    outputBuffer.destroy();
    paramsBuffer.destroy();

    // 5. Downsample the envelope for faster autocorrelation
    const downsampledLength = Math.floor(fullEnvelope.length / downsampleFactor);
    const downsampledEnvelope = new Float32Array(downsampledLength);
    for (let i = 0; i < downsampledLength; i++) {
        downsampledEnvelope[i] = fullEnvelope[i * downsampleFactor];
    }
    const downsampledRate = sampleRate / downsampleFactor;

    self.postMessage({ type: 'status', payload: 'Performing autocorrelation on signal envelope...' });

    // --- Autocorrelation on the CPU ---
    const minLag = Math.floor(downsampledRate * 60 / 220); // Min BPM: 60
    const maxLag = Math.floor(downsampledRate * 60 / 60);  // Max BPM: 220
    let bestLag = -1;
    let maxCorr = 0;

    for (let lag = minLag; lag < maxLag; lag++) {
        let correlation = 0;
        for (let i = 0; i < downsampledEnvelope.length - lag; i++) {
            correlation += downsampledEnvelope[i] * downsampledEnvelope[i + lag];
        }
        if (correlation > maxCorr) {
            maxCorr = correlation;
            bestLag = lag;
        }
    }

    if (bestLag === -1) {
        self.postMessage({ type: 'status', payload: 'Autocorrelation could not find a clear tempo.' });
        return 0;
    }

    const bpm = (60 * downsampledRate) / bestLag;
    self.postMessage({ type: 'status', payload: `Autocorrelation found tempo: ${bpm.toFixed(2)} BPM.` });

    return bpm;
}
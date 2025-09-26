import { performFFT } from './fft.js';
import { createGPUBuffer, createComputePipeline, executeComputePass, readGPUBuffer } from '../webgpu-helpers.js';

let spectralFluxShaderCode;
async function getShaderCode() {
    if (!spectralFluxShaderCode) {
        const response = await fetch('../shaders/spectral_flux.wgsl');
        spectralFluxShaderCode = await response.text();
    }
    return spectralFluxShaderCode;
}

/**
 * Calculates an onset novelty curve from an audio signal using the spectral flux method.
 * @param {GPUDevice} device - The WebGPU device.
 * @param {Float32Array} leftChannel - The left channel of the audio data.
 * @param {Float32Array} rightChannel - The right channel of the audio data.
 * @param {number} sampleRate - The sample rate of the audio.
 * @returns {Promise<Float32Array>} A promise that resolves with the onset novelty curve.
 */
export async function calculateOnsetNoveltyCurve(device, leftChannel, rightChannel, sampleRate) {
    // --- Configuration ---
    const fftSize = 1024; // Size of the FFT, power of 2
    const hopSize = 512;  // Overlap between frames
    const workgroupSize = 256; // Must match the shader

    // --- Setup ---
    self.postMessage({ type: 'status', payload: 'Starting onset detection...' });

    // 1. Mono mix the audio
    const monoSignal = new Float32Array(leftChannel.length);
    for (let i = 0; i < leftChannel.length; i++) {
        monoSignal[i] = (leftChannel[i] + rightChannel[i]) / 2;
    }

    // 2. Prepare WebGPU resources for spectral flux calculation
    const shaderCode = await getShaderCode();
    const fluxPipeline = createComputePipeline(device, shaderCode, 'main', 'Spectral Flux Pipeline');
    const spectrumSize = fftSize / 2;

    const prevSpectrumBuffer = createGPUBuffer(device, GPUBufferUsage.STORAGE, new Float32Array(spectrumSize), 'Previous Spectrum Buffer');
    const currentSpectrumBuffer = createGPUBuffer(device, GPUBufferUsage.STORAGE, new Float32Array(spectrumSize), 'Current Spectrum Buffer');
    const fluxResultBuffer = createGPUBuffer(device, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, new Float32Array(spectrumSize), 'Flux Result Buffer');

    const workgroupCountX = Math.ceil(spectrumSize / workgroupSize);

    // --- Processing ---
    const noveltyCurve = [];
    let prevSpectrum = new Float32Array(spectrumSize).fill(0);

    const numFrames = Math.floor((monoSignal.length - fftSize) / hopSize);
    self.postMessage({ type: 'status', payload: `Processing ${numFrames} frames...` });

    for (let i = 0; i < numFrames; i++) {
        const frameStart = i * hopSize;
        const frameEnd = frameStart + fftSize;
        const audioFrame = monoSignal.slice(frameStart, frameEnd);

        // a. Perform FFT on the current frame
        const currentSpectrum = await performFFT(device, audioFrame);

        // b. Update GPU buffers with the previous and current spectrum
        device.queue.writeBuffer(prevSpectrumBuffer, 0, prevSpectrum);
        device.queue.writeBuffer(currentSpectrumBuffer, 0, currentSpectrum);

        // c. Execute the spectral flux compute shader
        executeComputePass(device, fluxPipeline, [prevSpectrumBuffer, currentSpectrumBuffer, fluxResultBuffer], workgroupCountX, `Flux Pass ${i}`);

        // d. Read back the result and sum it
        const fluxResultData = await readGPUBuffer(device, fluxResultBuffer);
        const fluxValues = new Float32Array(fluxResultData);

        let spectralFlux = 0;
        for (let j = 0; j < fluxValues.length; j++) {
            spectralFlux += fluxValues[j];
        }
        noveltyCurve.push(spectralFlux);

        // e. Update previous spectrum for the next iteration
        prevSpectrum = currentSpectrum;

        if (i % 50 === 0) {
            self.postMessage({ type: 'status', payload: `Processed frame ${i}/${numFrames}` });
        }
    }

    // --- Cleanup ---
    prevSpectrumBuffer.destroy();
    currentSpectrumBuffer.destroy();
    fluxResultBuffer.destroy();

    self.postMessage({ type: 'status', payload: 'Onset detection finished.' });
    return new Float32Array(noveltyCurve);
}
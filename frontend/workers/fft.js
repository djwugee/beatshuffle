import { createGPUBuffer, createComputePipeline, executeComputePass, readGPUBuffer } from '../webgpu-helpers.js';

// We need to fetch the shader code since we don't have a bundler
let fftShaderCode;
async function getShaderCode() {
    if (!fftShaderCode) {
        const response = await fetch('../shaders/fft.wgsl');
        fftShaderCode = await response.text();
    }
    return fftShaderCode;
}

/**
 * Applies a Hanning window to the audio data.
 * This helps to reduce spectral leakage.
 * @param {Float32Array} data - The input audio data.
 */
function applyWindow(data) {
    const N = data.length;
    for (let i = 0; i < N; i++) {
        data[i] *= 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
    }
}

/**
 * Performs a bit-reversal permutation on the input data.
 * This is a necessary step for the Cooley-Tukey FFT algorithm.
 * @param {Float32Array} data - The complex data array (interleaved real/imag).
 * @param {number} transformSize - The size of the FFT.
 */
function bitReverse(data, transformSize) {
    const N = transformSize;
    for (let i = 0; i < N; i++) {
        let j = 0;
        let n = i;
        for (let b = 0; b < Math.log2(N); b++) {
            j = (j << 1) | (n & 1);
            n = n >> 1;
        }

        if (j > i) {
            // Swap complex numbers
            const tempReal = data[i * 2];
            const tempImag = data[i * 2 + 1];
            data[i * 2] = data[j * 2];
            data[i * 2 + 1] = data[j * 2 + 1];
            data[j * 2] = tempReal;
            data[j * 2 + 1] = tempImag;
        }
    }
}

/**
 * Performs a Fast Fourier Transform on a chunk of audio data using WebGPU.
 * @param {GPUDevice} device - The WebGPU device.
 * @param {Float32Array} audioChunk - The chunk of audio data (must be a power of 2).
 * @returns {Promise<Float32Array>} A promise that resolves with the magnitude spectrum.
 */
export async function performFFT(device, audioChunk) {
    const transformSize = audioChunk.length;
    if ((transformSize & (transformSize - 1)) !== 0) {
        throw new Error('FFT transform size must be a power of 2.');
    }

    // 1. Prepare the data for FFT
    applyWindow(audioChunk);
    const complexData = new Float32Array(transformSize * 2);
    for (let i = 0; i < transformSize; i++) {
        complexData[i * 2] = audioChunk[i]; // Real part
        complexData[i * 2 + 1] = 0;         // Imaginary part
    }
    bitReverse(complexData, transformSize);

    // 2. Setup WebGPU resources
    const shaderCode = await getShaderCode();
    const pipeline = createComputePipeline(device, shaderCode, 'main', 'FFT Pipeline');

    const dataBuffer = createGPUBuffer(device, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, complexData, 'FFT Data Buffer');
    const paramsBuffer = device.createBuffer({
        size: 8,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: 'FFT Params Buffer',
    });

    // 3. Execute the FFT stages
    const numStages = Math.log2(transformSize);
    const workgroupCountX = transformSize / 2 / 64; // Workgroup size is 64

    for (let stage = 0; stage < numStages; stage++) {
        device.queue.writeBuffer(paramsBuffer, 0, new Uint32Array([transformSize, stage]));
        executeComputePass(device, pipeline, [dataBuffer, paramsBuffer], workgroupCountX, `FFT Stage ${stage}`);
    }

    // 4. Read back the result
    const resultBuffer = await readGPUBuffer(device, dataBuffer);
    const resultData = new Float32Array(resultBuffer);

    // 5. Calculate the magnitude spectrum
    const magnitude = new Float32Array(transformSize / 2);
    for (let i = 0; i < transformSize / 2; i++) {
        const real = resultData[i * 2];
        const imag = resultData[i * 2 + 1];
        magnitude[i] = Math.sqrt(real * real + imag * imag);
    }

    dataBuffer.destroy();
    paramsBuffer.destroy();

    return magnitude;
}
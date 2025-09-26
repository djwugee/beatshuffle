/**
 * Initializes WebGPU by requesting an adapter and a device.
 * @returns {Promise<{adapter: GPUAdapter, device: GPUDevice}>}
 * @throws {Error} if WebGPU is not supported or a device cannot be obtained.
 */
export async function initializeWebGPU() {
    if (!navigator.gpu) {
        throw new Error("WebGPU not supported on this browser.");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error("No appropriate GPUAdapter found.");
    }

    const device = await adapter.requestDevice();
    if (!device) {
        throw new Error("No appropriate GPUDevice found.");
    }

    device.lost.then((info) => {
        console.error(`WebGPU device was lost: ${info.message}`);
        // Potentially trigger a UI update or recovery mechanism.
    });

    return { adapter, device };
}

/**
 * Creates a GPU buffer with specified usage and initial data.
 * @param {GPUDevice} device - The WebGPU device.
 * @param {number} usage - The buffer usage flags (e.g., GPUBufferUsage.STORAGE).
 * @param {Float32Array | Uint32Array} data - The initial data for the buffer.
 * @param {string} label - A descriptive label for the buffer for debugging.
 * @returns {GPUBuffer} The created GPU buffer.
 */
export function createGPUBuffer(device, usage, data, label = 'GPU Buffer') {
    const buffer = device.createBuffer({
        label,
        size: data.byteLength,
        usage: usage | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
    });
    const constructor = data.constructor; // Float32Array or Uint32Array
    new constructor(buffer.getMappedRange()).set(data);
    buffer.unmap();
    return buffer;
}

/**
 * Creates a compute pipeline for executing a shader.
 * @param {GPUDevice} device - The WebGPU device.
 * @param {string} shaderCode - The WGSL code for the compute shader.
 * @param {string} entryPoint - The name of the entry point function in the shader.
 * @param {string} label - A descriptive label for the pipeline.
 * @returns {GPUComputePipeline} The created compute pipeline.
 */
export function createComputePipeline(device, shaderCode, entryPoint, label = 'Compute Pipeline') {
    const shaderModule = device.createShaderModule({
        label: `${label} Shader Module`,
        code: shaderCode,
    });

    const pipeline = device.createComputePipeline({
        label,
        layout: 'auto',
        compute: {
            module: shaderModule,
            entryPoint: entryPoint,
        },
    });

    return pipeline;
}

/**
 * Executes a compute pass with a given pipeline and buffers.
 * @param {GPUDevice} device - The WebGPU device.
 * @param {GPUComputePipeline} pipeline - The compute pipeline to execute.
 * @param {GPUBuffer[]} buffers - An array of GPU buffers to bind to the shader.
 * @param {number} workgroupCountX - The number of workgroups to dispatch in the X dimension.
 * @param {string} label - A descriptive label for the compute pass.
 */
export function executeComputePass(device, pipeline, buffers, workgroupCountX, label = 'Compute Pass') {
    const bindGroup = device.createBindGroup({
        label: `${label} Bind Group`,
        layout: pipeline.getBindGroupLayout(0),
        entries: buffers.map((buffer, i) => ({
            binding: i,
            resource: { buffer },
        })),
    });

    const encoder = device.createCommandEncoder({ label: `${label} Command Encoder` });
    const pass = encoder.beginComputePass({ label });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(workgroupCountX);
    pass.end();
    device.queue.submit([encoder.finish()]);
}

/**
 * Reads data from a GPU buffer back to the CPU.
 * @param {GPUDevice} device - The WebGPU device.
 * @param {GPUBuffer} buffer - The GPU buffer to read from.
 * @returns {Promise<ArrayBuffer>} A promise that resolves with the buffer's data.
 */
export async function readGPUBuffer(device, buffer) {
    const size = buffer.size;
    const readBuffer = device.createBuffer({
        label: 'Readback Buffer',
        size,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    const encoder = device.createCommandEncoder();
    encoder.copyBufferToBuffer(buffer, 0, readBuffer, 0, size);
    device.queue.submit([encoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    const data = readBuffer.getMappedRange().slice(0);
    readBuffer.unmap();
    readBuffer.destroy();

    return data;
}
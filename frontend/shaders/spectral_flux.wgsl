// WebGPU Compute Shader for calculating Spectral Flux.

// Spectral Flux is the sum of the positive changes in magnitude
// between the spectra of two consecutive frames.

@group(0) @binding(0) var<storage, read> prev_spectrum: array<f32>;
@group(0) @binding(1) var<storage, read> current_spectrum: array<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<f32>; // Should be a single f32

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let i = global_id.x;

    // The array sizes are determined by the FFT size (e.g., 1024 bins)
    // This check is a safeguard.
    let spectrum_size = arrayLength(&current_spectrum);
    if (i >= spectrum_size) {
        return;
    }

    // Calculate the difference in magnitude for the current frequency bin.
    // We only care about positive changes (new energy).
    let diff = current_spectrum[i] - prev_spectrum[i];
    let rectified_diff = max(0.0, diff);

    // This is a reduction operation. Each invocation calculates a partial sum.
    // The results from all invocations must be summed on the CPU side
    // to get the final spectral flux value for this frame.
    // A more advanced implementation might use shared workgroup memory for a parallel reduction on the GPU.
    // For simplicity, we will do the final sum on the CPU.
    output[i] = rectified_diff;
}
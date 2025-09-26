// WebGPU Compute Shader for a Radix-2 FFT
// This shader performs a single stage of the Cooley-Tukey FFT algorithm.
// It will be dispatched multiple times to complete the full FFT.

// This implementation expects complex numbers to be stored as pairs of floats.
// input[2*i] is the real part, input[2*i+1] is the imaginary part.

struct Params {
    transform_size: u32,
    stage: u32,
};

@group(0) @binding(0) var<storage, read_write> data: array<f32>;
@group(0) @binding(1) var<uniform> params: Params;

const PI: f32 = 3.141592653589793;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let i = global_id.x;
    if (i >= params.transform_size / 2u) {
        return;
    }

    let half_m = 1u << params.stage;
    let m = half_m * 2u;

    // Calculate the indices for the butterfly operation
    let k = i % half_m;
    let j_base = (i - k) * 2u;
    let j1 = j_base + k;
    let j2 = j_base + k + half_m;

    // Twiddle factor calculation
    let angle = -2.0 * PI * f32(k) / f32(m);
    let twiddle_real = cos(angle);
    let twiddle_imag = sin(angle);

    // Load the complex numbers from the data array
    let val1_real = data[2u * j1];
    let val1_imag = data[2u * j1 + 1u];

    let val2_real = data[2u * j2];
    let val2_imag = data[2u * j2 + 1u];

    // Complex multiplication: val2 * twiddle
    let twiddled_real = val2_real * twiddle_real - val2_imag * twiddle_imag;
    let twiddled_imag = val2_real * twiddle_imag + val2_imag * twiddle_real;

    // Butterfly operation
    let result1_real = val1_real + twiddled_real;
    let result1_imag = val1_imag + twiddled_imag;

    let result2_real = val1_real - twiddled_real;
    let result2_imag = val1_imag - twiddled_imag;

    // Store the results back into the data array
    data[2u * j1] = result1_real;
    data[2u * j1 + 1u] = result1_imag;

    data[2u * j2] = result2_real;
    data[2u * j2 + 1u] = result2_imag;
}
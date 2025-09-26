// WebGPU Compute Shader for calculating a signal's envelope.

// This shader computes the envelope by taking the absolute value of the signal
// and then applying a simple moving average (a form of low-pass filter).

@group(0) @binding(0) var<storage, read> input_signal: array<f32>;
@group(0) @binding(1) var<storage, read_write> output_envelope: array<f32>;

struct Params {
    window_size: u32,
};
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let i = global_id.x;
    let signal_length = arrayLength(&input_signal);

    if (i >= signal_length) {
        return;
    }

    // A simple low-pass filter using a moving average.
    // We take the average of the absolute values in a small window around the current sample.
    var sum = 0.0;
    let half_window = params.window_size / 2u;

    let start = max(0, i - half_window);
    let end = min(signal_length - 1u, i + half_window);

    for (var j = start; j <= end; j = j + 1u) {
        sum = sum + abs(input_signal[j]);
    }

    output_envelope[i] = sum / f32(end - start + 1u);
}
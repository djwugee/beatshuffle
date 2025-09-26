document.addEventListener('DOMContentLoaded', () => {
    const audioFileInput = document.getElementById('audio-file');
    const patternInput = document.getElementById('pattern');
    const processButton = document.getElementById('process-button');
    const statusDiv = document.getElementById('status');
    const outputAudio = document.getElementById('output-audio');
    const downloadLink = document.getElementById('download-link');

    let worker;
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    function initializeWorker() {
        // Load the worker as a module to enable import statements.
        worker = new Worker('workers/beat-processor.js', { type: 'module' });

        worker.onmessage = (e) => {
            const { type, payload } = e.data;

            if (type === 'status') {
                statusDiv.textContent = payload;
            } else if (type === 'result') {
                statusDiv.textContent = 'Processing complete!';

                const { leftChannel, rightChannel, sampleRate } = payload;
                const newAudioBuffer = audioContext.createBuffer(2, leftChannel.length, sampleRate);
                newAudioBuffer.copyToChannel(leftChannel, 0);
                newAudioBuffer.copyToChannel(rightChannel, 1);

                const wavBlob = audioBufferToWav(newAudioBuffer);
                const audioUrl = URL.createObjectURL(wavBlob);

                outputAudio.src = audioUrl;
                outputAudio.style.display = 'block';

                downloadLink.href = audioUrl;
                downloadLink.download = 'processed_audio.wav';
                downloadLink.style.display = 'block';

                processButton.disabled = false;
            } else if (type === 'error') {
                statusDiv.textContent = `Error: ${payload}`;
                processButton.disabled = false;
            }
        };

        worker.onerror = (err) => {
            statusDiv.textContent = `Worker error: ${err.message}`;
            console.error('Worker error:', err);
            processButton.disabled = false;
        };
    }

    processButton.addEventListener('click', () => {
        const file = audioFileInput.files[0];
        const pattern = patternInput.value;

        if (!file) {
            statusDiv.textContent = 'Please select an audio file first.';
            return;
        }
        if (!pattern) {
            statusDiv.textContent = 'Please provide a manipulation pattern.';
            return;
        }
        if (worker) {
            worker.terminate();
        }
        initializeWorker();

        processButton.disabled = true;
        statusDiv.textContent = 'Reading and decoding audio file...';
        outputAudio.style.display = 'none';
        downloadLink.style.display = 'none';

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const audioData = e.target.result;
                const decodedAudio = await audioContext.decodeAudioData(audioData);

                const leftChannel = decodedAudio.getChannelData(0);
                // If mono, create a separate copy for the right channel to avoid transfer errors.
                const rightChannel = decodedAudio.numberOfChannels > 1
                    ? decodedAudio.getChannelData(1)
                    : leftChannel.slice();

                statusDiv.textContent = 'Audio decoded. Sending to worker...';
                worker.postMessage({
                    type: 'start',
                    payload: {
                        leftChannel,
                        rightChannel,
                        sampleRate: decodedAudio.sampleRate,
                        pattern
                    }
                }, [leftChannel.buffer, rightChannel.buffer]);

            } catch (error) {
                statusDiv.textContent = `Error decoding audio: ${error.message}`;
                console.error('Decoding error:', error);
                processButton.disabled = false;
            }
        };
        reader.onerror = () => {
            statusDiv.textContent = 'Error reading file.';
            processButton.disabled = false;
        };
        reader.readAsArrayBuffer(file);
    });

    initializeWorker();
});


// Helper functions to convert an AudioBuffer to a WAV file.
// Based on: https://github.com/mattdiamond/Recorderjs
function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    let result;
    if (numChannels === 2) {
        result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
    } else {
        result = buffer.getChannelData(0);
    }

    return encodeWAV(result, format, sampleRate, numChannels, bitDepth);
}

function encodeWAV(samples, format, sampleRate, numChannels, bitDepth) {
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * bytesPerSample, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * bytesPerSample, true);
    floatTo16BitPCM(view, 44, samples);

    return new Blob([view], { type: 'audio/wav' });
}

function floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function interleave(inputL, inputR) {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);
    let index = 0;
    let inputIndex = 0;
    while (index < length) {
        result[index++] = inputL[inputIndex];
        result[index++] = inputR[inputIndex];
        inputIndex++;
    }
    return result;
}
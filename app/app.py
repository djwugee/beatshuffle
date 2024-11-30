from flask import Flask, render_template, request, jsonify, send_file
import numpy as np
import yaml
import sys
import os
import soundfile as sf
import subprocess
import tempfile
import io
import logging
import traceback
import shutil
import time

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Add the parent directory to the system path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from beat_manipulator import beatswap

app = Flask(__name__)

def check_ffmpeg():
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True)
        return True
    except FileNotFoundError:
        return False

def load_presets():
    with open('beat_manipulator/presets.yaml', 'r') as f:
        presets = yaml.safe_load(f)
    return presets

def get_preset_pattern(preset_name):
    """Get the pattern for a preset, or return None if not found"""
    if preset_name == "None":
        return "test"
    presets = load_presets()
    if preset_name in presets:
        return presets[preset_name].get('pattern', 'test')
    return None

@app.route('/')
def index():
    presets = load_presets()
    preset_choices = ["None"] + list(presets.keys())
    return render_template('index.html', preset_choices=preset_choices)

@app.route('/process', methods=['POST'])
def process_audio():
    temp_dir = None
    response = None
    try:
        logger.info("Starting audio processing")
        
        # Check if FFmpeg is available
        if not check_ffmpeg():
            logger.error("FFmpeg not found")
            return jsonify({'error': 'FFmpeg is not installed. Please install FFmpeg to process audio files.'}), 500

        # Create a temporary directory for processing
        temp_dir = tempfile.mkdtemp()
        logger.info(f"Created temporary directory: {temp_dir}")
        
        # Get the uploaded file
        audiofile = request.files['audiofile']
        if not audiofile:
            logger.error("No audio file provided")
            return jsonify({'error': 'No audio file provided'}), 400

        try:
            # Get parameters from the form
            preset_name = request.form.get('preset_name', "None")
            pattern = request.form.get('pattern', 'test')
            
            # If a preset is selected, use its pattern
            if preset_name != "None":
                preset_pattern = get_preset_pattern(preset_name)
                if preset_pattern:
                    pattern = preset_pattern
            
            # Convert and validate numeric parameters
            try:
                scale = float(request.form.get('scale', 1))
                if scale <= 0:
                    scale = 1
            except (ValueError, TypeError):
                scale = 1
                
            try:
                shift = float(request.form.get('shift', 0))
            except (ValueError, TypeError):
                shift = 0
                
            caching = request.form.get('caching', 'true').lower() == 'true'
            variableBPM = request.form.get('variableBPM', 'false').lower() == 'true'

            logger.info(f"Processing parameters: preset={preset_name}, pattern={pattern}, scale={scale}, shift={shift}")

            # Save the uploaded file
            input_path = os.path.join(temp_dir, 'input' + os.path.splitext(audiofile.filename)[1])
            audiofile.save(input_path)
            logger.info(f"Saved input file to: {input_path}")

            # Process the audio using beatswap function
            output_path = os.path.join(temp_dir, 'output.wav')
            logger.info("Starting beatswap processing")

            # Call beatswap with the file path
            result = beatswap(
                audio=input_path,
                pattern=pattern,
                scale=scale,
                shift=shift,
                output=output_path,
                log=True
            )
            logger.info("Beatswap processing completed")

            if isinstance(result, str) and os.path.exists(result):
                # If beatswap returned a file path
                output_path = result
            elif isinstance(result, tuple):
                # If beatswap returned audio data and sample rate
                audio_data, sr = result
                sf.write(output_path, audio_data.T, sr)
            else:
                # If beatswap returned just audio data
                sf.write(output_path, result.T if isinstance(result, np.ndarray) else result, 44100)

            if os.path.exists(output_path):
                logger.info("Sending processed audio file")
                # Create a copy of the file that will be deleted after sending
                temp_output = os.path.join(temp_dir, 'final_output.wav')
                shutil.copy2(output_path, temp_output)
                
                response = send_file(
                    temp_output,
                    mimetype='audio/wav',
                    as_attachment=True,
                    download_name='processed.wav'
                )
                
                # Set headers to prevent caching
                response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                response.headers['Pragma'] = 'no-cache'
                response.headers['Expires'] = '0'
                
                return response
            else:
                logger.error("Output file not found")
                return jsonify({'error': 'Failed to generate output file'}), 500

        except Exception as e:
            error_msg = f"Processing error: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            return jsonify({'error': error_msg}), 500

    except Exception as e:
        error_msg = f"Server error: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        return jsonify({'error': error_msg}), 500

    finally:
        # Clean up temporary directory
        if temp_dir and os.path.exists(temp_dir):
            try:
                # Wait a brief moment to ensure file handles are closed
                time.sleep(0.1)
                shutil.rmtree(temp_dir, ignore_errors=True)
                logger.info(f"Cleaned up temporary directory: {temp_dir}")
            except Exception as e:
                logger.error(f"Error cleaning up temporary directory: {str(e)}")

if __name__ == '__main__':
    app.run(debug=True)

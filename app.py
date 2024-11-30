# pylint: disable=no-member,no-value-for-parameter,no-name-in-module
import gradio as gr
import numpy as np
from gradio.components import Audio, Textbox, Checkbox, Image, Dropdown
import beat_manipulator as bm
import cv2
import yaml

def load_presets():
    with open('beat_manipulator/presets.yaml', 'r') as f:
        presets = yaml.safe_load(f)
    return presets

def update_fields(preset_name):
    if preset_name == "None":
        return [gr.update(), gr.update(), gr.update()]
    presets = load_presets()
    if preset_name in presets:
        preset = presets[preset_name]
        pattern = preset.get('pattern', '')
        scale = preset.get('scale', [1])[0] if isinstance(preset.get('scale', [1]), list) else preset.get('scale', 1)
        shift = preset.get('shift', 0)
        return [pattern, scale, shift]
    return [gr.update(), gr.update(), gr.update()]

def BeatSwap(audiofile, preset_name: str = "None", pattern: str = 'test', scale: float = 1, shift: float = 0, caching: bool = True, variableBPM: bool = False):
    print()
    print(f'path = {audiofile}, preset = "{preset_name}", pattern = "{pattern}", scale = {scale}, shift = {shift}, caching = {caching}, variable BPM = {variableBPM}')
    
    # Apply preset if selected
    if preset_name != "None":
        presets = load_presets()
        if preset_name in presets:
            preset = presets[preset_name]
            pattern = preset.get('pattern', pattern)
            if 'scale' in preset:
                scale = preset['scale'][0] if isinstance(preset['scale'], list) else preset['scale']
            if 'shift' in preset:
                shift = preset.get('shift', shift)
    
    if pattern == '' or pattern is None: 
        pattern = 'test'
    if caching is not False: 
        caching = True
    if variableBPM is not True: 
        variableBPM = False
    if 'random' in pattern.lower(): 
        pattern = 'random'
    
    try:
        scale = bm.utils._safer_eval(scale)
    except:
        scale = 1
        
    try:
        shift = bm.utils._safer_eval(shift)
    except:
        shift = 0
        
    if scale < 0: 
        scale = -scale
    if scale < 0.02: 
        scale = 0.02
        
    print('Loading audiofile...')
    if audiofile is not None:
        try:
            song = bm.song(audio=audiofile, log=False)
        except Exception as e:
            print(f'Failed to load audio, retrying: {e}')
            song = bm.song(audio=audiofile, log=False)
    else: 
        print(f'Audiofile is {audiofile}')
        return
    
    try:
        print(f'Scale = {scale}, shift = {shift}, length = {len(song.audio[0]) / song.sr}')
        if len(song.audio[0]) > (song.sr * 1800):
            song.audio = np.array(song.audio, copy=False)
            song.audio = song.audio[:, :song.sr * 1800]
    except Exception as e: 
        print(f'Reducing audio size failed, why? {e}')
        
    lib = 'madmom.BeatDetectionProcessor' if variableBPM is False else 'madmom.BeatTrackingProcessor'
    song.path = '.'.join(song.path.split('.')[:-1])[:-8] + '.' + song.path.split('.')[-1]
    print(f'path: {song.path}')
    print('Generating beatmap...')
    song.beatmap_generate(lib=lib, caching=caching)
    song.beatmap_shift(shift)
    song.beatmap_scale(scale)
    print('Generating image...')
    
    try:
        song.image_generate()
        image = bm.image.bw_to_colored(song.image)
        y = min(len(image), len(image[0]), 2048)
        y = max(y, 2048)
        image = np.rot90(np.clip(cv2.resize(image, (y, y), interpolation=cv2.INTER_LINEAR), -1, 1))
    except Exception as e: 
        print(f'Image generation failed: {e}')
        image = np.asarray([[0.5, -0.5], [-0.5, 0.5]])
        
    print('Beatswapping...')
    song.beatswap(pattern=pattern, scale=1, shift=0)
    song.audio = (np.clip(np.asarray(song.audio), -1, 1) * 32766).astype(np.int16).T
    print('___ SUCCESS ___')
    return ((song.sr, song.audio), image)

# Load presets for dropdown
presets = load_presets()
preset_choices = ["None"] + list(presets.keys())

# Custom CSS for better styling
custom_css = """
.container { max-width: 1200px; margin: auto; }
.title { text-align: center; margin-bottom: 2rem; }
.title h1 { color: #2196F3; margin-bottom: 0.5rem; }
.title p { font-size: 1.1rem; color: #666; }
.links { margin-top: 1rem; }
.links a { color: #2196F3; text-decoration: none; margin-right: 1rem; }
.links a:hover { text-decoration: underline; }
.input-section { background: #f5f5f5; padding: 1.5rem; border-radius: 8px; }
.output-section { background: #f8f8f8; padding: 1.5rem; border-radius: 8px; }
.process-btn { background: #2196F3 !important; color: white !important; }
.process-btn:hover { background: #1976D2 !important; }
"""

# Create interface using Blocks
with gr.Blocks(theme=gr.themes.Soft(), css=custom_css) as interface:
    with gr.Column(elem_classes="container"):
        # Title Section
        with gr.Column(elem_classes="title"):
            gr.Markdown("""# Stunlocked's Beat Manipulator""")
            gr.Markdown("""Remix music using AI-powered beat detection and advanced beat swapping. 
                Make "every other beat is missing" remixes, or completely change beat of the song.""")
            with gr.Row(elem_classes="links"):
                gr.Markdown("""[Github](https://github.com/stunlocked1/beat_manipulator) | 
                    [Colab Version](https://colab.research.google.com/drive/1gEsZCCh2zMKqLmaGH5BPPLrImhEGVhv3?usp=sharing)""")
    
        with gr.Row(equal_height=True):
            # Input Section
            with gr.Column(elem_classes="input-section"):
                gr.Markdown("### Input Settings")
                audiofile = Audio(type='filepath', label="Upload Audio", scale=1)
                
                with gr.Group():
                    gr.Markdown("#### Preset & Pattern")
                    presetbox = Dropdown(
                        choices=preset_choices, 
                        value="None", 
                        label="Select Preset", 
                        type="value"
                    )
                    patternbox = Textbox(
                        label="Pattern",
                        placeholder="1, 3, 2, 4!",
                        value="1, 2>0.5, 3, 4>0.5, 5, 6>0.5, 3, 4>0.5, 7, 8",
                        lines=1
                    )
                
                with gr.Group():
                    gr.Markdown("#### Beat Settings")
                    scalebox = Textbox(
                        value=1,
                        label="Beatmap Scale",
                        info="At 2, every two beat positions will be merged, at 0.5 - a beat position added between every two existing ones.",
                        placeholder=1,
                        lines=1
                    )
                    shiftbox = Textbox(
                        value=0,
                        label="Beatmap Shift",
                        info="Shift in beats (applies before scaling)",
                        placeholder=0,
                        lines=1
                    )
                
                with gr.Group():
                    gr.Markdown("#### Advanced Options")
                    cachebox = Checkbox(
                        value=True,
                        label="Enable Caching",
                        info="Save generated beatmaps for faster loading"
                    )
                    beatdetectionbox = Checkbox(
                        value=False,
                        label="Variable BPM Support",
                        info="Enables support for variable BPM (slightly less accurate)"
                    )
                
                btn = gr.Button("Process Audio", elem_classes="process-btn")
            
            # Output Section
            with gr.Column(elem_classes="output-section"):
                gr.Markdown("### Output")
                audio_output = Audio(
                    type='numpy',
                    format="mp3",
                    label="Processed Audio"
                )
                image_output = Image(
                    type='numpy',
                    label="Beat Visualization",
                    elem_id="beat-image"
                )
    
    # Add event handlers
    presetbox.change(fn=update_fields, inputs=[presetbox], outputs=[patternbox, scalebox, shiftbox])
    btn.click(
        fn=BeatSwap,
        inputs=[audiofile, presetbox, patternbox, scalebox, shiftbox, cachebox, beatdetectionbox],
        outputs=[audio_output, image_output]
    )
    

interface.launch(share=False)
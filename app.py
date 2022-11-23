import gradio as gr
import BeatManipulator as bm
def BeatSwap(pattern: str):
    audio=bm.song()
    audio.quick_beatswap(output=None, pattern=pattern)
    return audio.audio

ui=gr.Interface (fn=BeatSwap,inputs="audio",outputs="audio" )
ui.launch
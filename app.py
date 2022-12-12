import gradio as gr
import BeatManipulator as bm
def BeatSwap(pattern: str):
    song=bm.song()
    song.quick_beatswap(output=None, pattern=pattern)
    return song.audio

ui=gr.Interface (fn=BeatSwap,inputs="audio",outputs="audio",theme="default" )
ui.launch
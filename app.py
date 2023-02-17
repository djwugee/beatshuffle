import gradio as gr, numpy as np
from gradio.components import Audio, Textbox, Checkbox
import beat_manipulator as bm
def BeatSwap(audiofile, pattern: str, scale:float, shift:float, caching:bool):
    scale=float(scale)
    shift=float(shift)
    song=bm.song(path=audiofile, filename=audiofile.split('.')[-2][:-8]+'.'+audiofile.split('.')[-1], caching=caching)
    song.quick_beatswap(output=None, pattern=pattern, scale=scale, shift=shift)
    #song.write_audio(output=bm.outputfilename('',song.filename, suffix=' (beatswap)'))
    return (song.samplerate, np.asarray(song.audio).T)

audiofile=Audio(source='upload', type='filepath')
patternbox = Textbox(label="Pattern:", placeholder="1, 3, 2r, 4d8", lines=1)
scalebox = Textbox(value=1, label="Beatmap scale, beatmap's beats per minute will be multiplied by this:", placeholder=1, lines=1)
shiftbox = Textbox(value=0, label="Beatmap shift, in beats (applies before scaling):", placeholder=0, lines=1)
cachebox = Checkbox(value=True, label="""Enable caching beatmaps. If True, a text file with the beatmap will be saved to the server (your PC if you are running locally), so that beatswapping for the second time doesn't have to generate the beatmap again. 

Text file will be named after your file, and will only contain a list of numbers of positions of each beat. Note: I have no idea if this actually works on Hugging Face.""")

gr.Interface (fn=BeatSwap,inputs=[audiofile,patternbox,scalebox,shiftbox, cachebox],outputs=Audio(type='numpy'),theme="default",
title = "Stunlocked's Beat Manipulator"
,description = "Remix music via AI-powered beat detection and advanced beat swapping. https://github.com/stunlocked1/BeatManipulator/blob/main/presets.json"
,article="""# <h1><p style='text-align: center'><a href='https://github.com/stunlocked1/BeatManipulator' target='_blank'>Github</a></p></h1>

# Basic usage

Upload your audio, enter the beat swapping pattern, change scale and shift if needed, and run the app.

You can test where each beat is by writing `test` into the `pattern` field, which will put cowbells on each beat. Beatmap can sometimes be shifted, for example 0.5 beats forward, so this use scale and shift to adjust it.

Feel free to use complex patterns and very low scales - most of the computation time is in detecting beats, not swapping them.

# Pattern syntax

Patterns are sequences of numbers or ranges, separated by `,`. Numbers and ranges can be followed by letters that apply effects to them. Spaces can be freely used for formatting as they will be ignored. Any other character that isnt used in the syntax can also be used for formatting but only between beats, not inside them.
- `1, 3, 2, 4` - every 4 beats, swap 2nd and 3rd beat. This pattern loops every 4 beats, because 4 is the biggest number in it.
- `!` after a number sets length of the pattern (beat isnt played). `1, 3, 2, 4, 8!` - every 8 beats, swap 2nd and 3rd beat, and 5-8 beats will be skipped.
- `1, 3, 4` - skip 2nd beat
- `1, 2, 2, 4` - repeat 2nd beat
- `1, 1:1.5, 4` - play a range of beats. `0:0.5` means first half of 1st beat. Keep that in mind, to play first half of 5th beat, you do `4:4.5`, not `5:5.5`. `1` is equivalent to `0:1`. `1.5` is equivalent to `0.5:1.5`. `1,2,3,4` is `0:4`.
- `1, 0:1/3, 0:1/3, 2/3:1` - you can use expressions with `+`, `-`, `*`, `/`.
- `?` after a beat makes that number not count for looping. `1, 2, 3, 4!, 8?` - every 4 beats, 4th beat is replaced with 8th beat.
- `v` + number - controls volume of that beat. `1v2` means 200% volume, `1v1/3` means 33.33% volume, etc.
- `r` after a beat reverses that beat. `1r, 2` - every two beats first beat will be reversed
- another way to reverse - `4:0` is reversed `0:4`.
- `s` + number - changes speed and pitch of that beat. 2 will be 2 times faster, 1/2 will be 2 times slower. Note: Only integers or 1/integer numbers are supported, everything else will be rounded.
- `c` - swaps left and right channels of the beat. If followed by 0, mutes left channel instead, 1 - right channel.
- `b` + number - bitcrush. The higher the number, the stronger the effect. Barely noticeable at values less then 1
- `d` + number - downsample (8-bit sound). The higher the number, the stronger the effect. Starts being noticeable at 3, good 8-bit sounding values are around 8+.
- `t` + number - saturation
- you can combine stuff like `0:1/3d8v2cr` - that line means 0:1/3 beat will be downsampled, 200% volume, swapped channels, and reversed

there are certain commands you can write in pattern instead of the actual pattern:
- `random` - each beat will be randomly selected from all beats, basically similar to shuffling all beats
- `reverse` - reverses the order of all beats
- `test` - test beat detection by putting cowbells on each beat. The highest pitched cowbell should be on the first beat; next cowbell should be on the snare. If it is not, use scale and shift.

There are also some interesting patterns there: https://github.com/stunlocked1/BeatManipulator/blob/main/presets.json. Those are meant to be used with properly adjusted shift and scale, where 1st beat is 1st kick, 2nd beat is the snare after it.
"""
 ).launch(share=False)
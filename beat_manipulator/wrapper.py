from . import main as bm
from .main import _outputfilename
import json
def _safer_eval(string:str) -> float:
    if isinstance(string, str): 
        #print(''.join([i for i in string if i.isdecimal() or i in '.+-*/']))
        string = eval(''.join([i for i in string if i.isdecimal() or i in '.+-*/']))
    return string

with open("presets.json", "r") as f:
    presets=f.read()

presets=json.loads(presets)

def _song_copy(audio:bm.song):
    return bm.song(path=audio.path, audio=audio.audio, samplerate=audio.samplerate, bmap=audio.beatmap, caching=audio.caching, filename=audio.filename, copied=True)

def _normalize(song: bm.song, beat, pattern=None, scale=None, shift=None):
    beat=beat.lower()
    if pattern is not None:
        if scale is None: scale=1
        if shift is None: shift=0
        song.quick_beatswap(output=None, pattern=pattern, scale=scale,shift=shift)
    elif beat=='normal' or beat is None: pass
    elif beat=='shifted': song.quick_beatswap(output=None, pattern='1,2,3,4,5,7,6,8', scale=0.5)
    elif beat=='shifted2': song.quick_beatswap(output=None, pattern='1,2,3,4,5,6,8,7', scale=0.5)
    else: print(f"'{beat}' is not a valid beat")
    return song

def lib_test(filename,output='', samplerate=44100, lib='madmom.BeatDetectionProcessor', scale=1, shift=0,beat='normal', log=False):
    '''basically a way to quickly test scale and offset'''
    if type(filename)==str :
        song=bm.song(filename)
        samplerate=song.samplerate
    else:
        song=filename
    if beat!='normal' and beat is not None: song=_normalize(song=song, beat=beat, scale=scale, shift=shift)
    song.quick_beatswap(output=None, pattern='test', scale=scale, shift=shift, log=log)
    if beat!='normal' and beat is not None: song=_normalize(song=song, beat=beat, scale=scale, shift=shift)
    song.write_audio(output=bm.outputfilename('', song.filename, f' ({lib} x{scale} {shift})'))

def lib_test_full(filename,samplerate, log):
    '''A way to test all beat detection modules to see which one performs better.'''
    print(filename)
    lib_test(filename, samplerate,'madmom.BeatDetectionProcessor', log=log)
    lib_test(filename, samplerate,'madmom.BeatDetectionProcessor.consistent', log=log)
    #lib_test(filename, samplerate,'madmom.BeatTrackingProcessor') # better for live performances with variable BPM
    #lib_test(filename, samplerate,'madmom.BeatTrackingProcessor.constant') # results identical to madmom.BeatDetectionProcessor
    lib_test(filename, samplerate,'madmom.BeatTrackingProcessor.consistent', log=log)
    lib_test(filename, samplerate,'madmom.CRFBeatDetectionProcessor', log=log)
    lib_test(filename, samplerate,'madmom.CRFBeatDetectionProcessor.constant',log=log)
    #lib_test(filename, samplerate,'madmom.DBNBeatTrackingProcessor') # better for live performances with variable BPM
    lib_test(filename, samplerate,'madmom.DBNBeatTrackingProcessor.1000',log=log)
    lib_test(filename, samplerate,'madmom.DBNDownBeatTrackingProcessor',log=log)
    import gc
    gc.collect()

def _process_list(something)-> list:
    if isinstance(something, int) or isinstance(something, float): something=(something,)
    elif isinstance(something,list): False if isinstance(something[0],int) or isinstance(something[0],float) else list(_safer_eval(i) for i in something)
    else: something=list(_safer_eval(i) for i in something.split(','))
    return something

def _process(song:bm.song, preset: str, scale:float, shift:float, random=False, every=False, log=True)->bm.song:
    #print(preset)
    if 'pattern' in preset:
        shift=shift+(preset['shift'] if 'shift' in preset else 0)
        # Scale can be a list and we either take one value or all of them
        if 'scale' in preset: pscale=_process_list(preset['scale'])
        else: pscale=(1,)
        #input(pscale)
        if random is True:
            import random
            pscale=random.choice(pscale)
        elif every is True:
            songs=[]
            for i in pscale:
                song2=_song_copy(song)
                song2.quick_beatswap(output=None, pattern=preset['pattern'], scale=scale*i, shift=shift, log = log)
                songs.append((song2, i))
            return songs
        else: pscale=preset['scale_d'] if 'scale_d' in preset else pscale[0]
        if every is False: song.quick_beatswap(output=None, pattern=preset['pattern'], scale=scale*pscale, shift=shift, log = log)
    elif preset['type'] =='sidechain':
        length=preset['sc length'] if 'sc length' in preset else 0.5
        curve=preset['sc curve'] if 'sc curve' in preset else 2
        vol0=preset['sc vol0'] if 'sc vol0' in preset else 0
        vol1=preset['sc vol1'] if 'sc vol1' in preset else 1
        from . import generate
        sidechain=bm.open_audio(preset['sc impulse'])[0] if 'sc impulse' in preset else generate.sidechain(samplerate=song.samplerate, length=length, curve=curve, vol0=vol0, vol1=vol1, smoothing=40)
        scale=scale*(preset['scale'] if 'scale' in preset else 1)
        shift=shift+(preset['shift'] if 'shift' in preset else 0)
        song.quick_sidechain(output=None, audio2=sidechain, scale=scale, shift=shift)
    elif preset['type'] =='beatsample':
        sample=preset['filename']
        scale=scale*(preset['scale'] if 'scale' in preset else 1)
        shift=shift+(preset['shift'] if 'shift' in preset else 0)
        song.quick_beatsample(output=None, filename2=sample, scale=scale, shift=shift)
    return song


def use_preset(output:str,song: str, preset: str, presets=presets, scale=1, shift=0, beat:str='normal', test=False, _normalize=True, random=False, every=False, log = True):
    if not isinstance(song, bm.song): 
        song=bm.song(song)
    else: song = _song_copy(song)
    #print(song.samplerate)
    if preset is None:
        weights=[]
        for i in presets.items():
            weights.append(i[1]['weight'])
        import random
        preset = random.choices(population=list(presets), weights=weights, k=1)[0]
    name=preset
    if isinstance(preset, str): preset=presets[preset]
    if test is True:
        testsong=_song_copy(song)
        lib_test(testsong, output, samplerate=testsong.samplerate, log = log)
        del testsong
    #print(name, preset)
    if _normalize is True and beat!='normal' and beat is not None:
        if '_normalize' in preset:
            if preset['_normalize'] is True:
                song=_normalize(song, beat)
    if '1' in preset:
        for i in preset:
            if type(preset[i])==dict:song=_process(song, preset[i], scale=scale, shift=shift, log=log)
    else: song=_process(song, preset,scale=scale,shift=shift,random=random, every=every, log=log)
    if isinstance(song, list): 
        for i in song:
            i[0].write(output=_outputfilename(output, i[0].filename, suffix=f' ({name}{(" x"+str(round(i[1], 3)))*(len(song)>1)})'))
    else: 
        out_folder = _outputfilename(output,  song.filename, suffix=' ('+name+')')
        song.write(output=out_folder)
        return out_folder

def all(output:str,filename: str, presets:dict=presets, scale=1, shift=0, beat='normal', test=True, boring=False, effects=False, variations=False, log = False):
    if boring is False:
        for i in ['2x faster','3x faster','4x faster','8x faster','1.33x faster','1.5x faster','1.5x slower','reverse','random', 'syncopated effect']:
            if i in presets: 
                #print(i)
                presets.pop(i)
    if not isinstance(filename, bm.song): song=bm.song(filename)
    else: song=filename
    song__normalized=_normalize(_song_copy(song), beat)
    if test is True:
        testsong=_song_copy(song)
        lib_test(testsong, output, samplerate=testsong.samplerate, log = log)
        del testsong
    for key, i in presets.items():
        #print(key, i)
        if 'scale' in i:
            #print(i['scale'])
            if isinstance(i['scale'], int) or isinstance(i['scale'], float):
                if i['scale']<0.01:
                    continue
                if effects is False:
                    if 'effect - ' in key: continue
        if '_normalize' in i:
            if i['_normalize'] is True:
                song2=_song_copy(song__normalized)
            else: song2=_song_copy(song)
        else: song2=_song_copy(song)
        use_preset(output, song2, preset=key, presets=presets, scale=scale, shift=shift, beat=beat, test=False, _normalize=False, every=variations, log = log)



# ___ my stuff ___

# ___ get song ___
#filename='F:/Stuff/Music/Tracks/Poseidon & Leon Ross - Parallax.mp3'
#filename = 'F:/Stuff/Music/Tracks/'+random.choice(os.listdir("F:\Stuff\Music\Tracks"))
# print(filename)

# ___ analyze+fix ___
#scale, shift = 1,0
#lib_test(filename, scale=scale, shift=shift)
#bm.fix_beatmap(filename, scale=scale, shift=shift)

# ___ presets ___
#use_preset ('', filename, 'dotted kicks', scale=1, shift=0, beat='normal', test=False)
#use_preset ('', filename, None, scale=scale, shift=shift, test=False)
#all('', filename, scale=1, shift=0, beat='normal', test=False)

# ___ beat swap __
#song=bm.song(filename)
#song.quick_beatswap(output='', pattern='test', scale=1, shift=0)

# ___ osu ___
#song=bm.song()
#song.generate_hitmap()
#song.osu()
#song.hitsample()

# ___ saber2osu ___
#import Saber2Osu as s2o
#osu=s2o.osu_map(threshold=0.3, declumping=100)

# ___ song to image ___
#song.write_image()

# ___ randoms ___
# while True:
#     filename = 'F:/Stuff/Music/Tracks/'+random.choice(os.listdir("F:\Stuff\Music\Tracks"))
#     use_preset ('', filename, None, scale=scale, shift=shift, test=False)

# ___ effects ___
#song = bm.song(filename)
#song.audio=bm.pitchB(song.audio, 2, 100)
#song.write_audio(bm.outputfilename('',filename, ' (pitch)'))
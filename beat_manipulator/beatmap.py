import numpy as np
from collections.abc import MutableMapping, MutableSequence
import madmom
from madmom.features.tempo import TempoEstimationProcessor, TempoHistogramProcessor
from . import utils

def scale(beatmap: np.ndarray, scale: float, log=True, integer=True) -> np.ndarray:
    if isinstance(scale, str):
        scale = utils._safer_eval(scale)
    assert scale > 0, f"scale should be > 0, your scale is {scale}"
    if scale == 1:
        return beatmap
    else:
        import math
        if log is True:
            print(f'scale={scale}; ')
        a = 0
        b = np.array([], dtype=int)
        if scale % 1 == 0:
            while a < len(beatmap):
                b = np.append(b, beatmap[int(a)])
                a += scale
        else:
            if integer is True:
                while a + 1 < len(beatmap):
                    b = np.append(b, int((1 - (a % 1)) * beatmap[math.floor(a)] + (a % 1) * beatmap[math.ceil(a)]))
                    a += scale
            else:
                while a + 1 < len(beatmap):
                    b = np.append(b, (1 - (a % 1)) * beatmap[math.floor(a)] + (a % 1) * beatmap[math.ceil(a)])
                    a += scale
        return b

def shift(beatmap: np.ndarray, shift: float, log=True, mode=1) -> np.ndarray:
    if isinstance(shift, str):
        shift = utils._safer_eval(shift)
    if shift == 0:
        return beatmap
    # positive shift
    elif shift > 0:
        # full value of beats is removed from the beginning
        if shift >= 1:
            beatmap = beatmap[int(shift // 1):]
        # shift beatmap by the decimal value
        if shift % 1 != 0:
            shift = shift % 1
            for i in range(len(beatmap) - int(shift) - 1):
                beatmap[i] = int(beatmap[i] + shift * (beatmap[i + 1] - beatmap[i]))
    # negative shift
    else:
        shift = -shift
        # full values are inserted in between first beats
        if shift >= 1:
            if mode == 1:
                step = int((beatmap[-1] - beatmap[0]) / (int(shift // 1) + 1))
                beatmap = np.insert(arr=beatmap, obj=1, values=np.linspace(start=beatmap[0] + step - 1, stop=beatmap[0] + step, num=int(shift // 1)))
            elif mode == 2:
                for i in range(int(shift // 1)):
                    beatmap = np.insert(arr=beatmap, obj=(i * 2) + 1, values=int((beatmap[i * 2] + beatmap[(i * 2) + 1]) / 2))
        # shift beatmap by the decimal value
        if shift % 1 != 0:
            shift = shift % 1
            for i in reversed(range(len(beatmap))):
                if i == 0:
                    continue
                beatmap[i] = int(beatmap[i] - shift * (beatmap[i] - beatmap[i - 1]))
    return beatmap

def generate(audio: np.ndarray, sr: int, lib='madmom.BeatDetectionProcessor', caching=True, filename: str = None, log=True, load_settings=True, split=None):
    """Creates beatmap attribute with a list of positions of beats in samples."""
    if log is True:
        print(f'Analyzing beats using {lib}; ', end='')

    # load a beatmap if it is cached:
    if caching is True and filename is not None:
        audio_id = hex(len(audio))
        import os
        if not os.path.exists('beat_manipulator/beatmaps'):
            os.mkdir('beat_manipulator/beatmaps')
        cacheDir = "beat_manipulator/beatmaps/" + ''.join(filename.replace('\\', '/').split('/')[-1]) + "_" + lib + "_" + audio_id + '.txt'
        try:
            beatmap = np.loadtxt(cacheDir, dtype=int)
            if log is True:
                print('loaded cached beatmap.')
        except OSError:
            if log is True:
                print("beatmap hasn't been generated yet. Generating...")
            beatmap = None

    # generate the beatmap
    if beatmap is None:
        if 'madmom' in lib.lower():
            assert len(audio) > sr * 2, f'Audio file is too short, len={len(audio)} samples, or {len(audio) / sr} seconds. Minimum length is 2 seconds, audio below that breaks madmom processors.'

        rnn_processor = madmom.features.beats.RNNBeatProcessor()

        if lib == 'madmom.BeatTrackingProcessor':
            proc = madmom.features.beats.BeatTrackingProcessor(fps=100)
            act = rnn_processor(madmom.audio.signal.Signal(audio.T, sr))
            proc_result = proc(act)
        elif lib == 'madmom.BeatTrackingProcessor.constant':
            proc = madmom.features.beats.BeatTrackingProcessor(fps=100, look_ahead=None)
            act = rnn_processor(madmom.audio.signal.Signal(audio.T, sr))
            proc_result = proc(act)
        elif lib == 'madmom.BeatTrackingProcessor.consistent':
            proc = madmom.features.beats.BeatTrackingProcessor(fps=100, look_ahead=None, look_aside=0)
            act = rnn_processor(madmom.audio.signal.Signal(audio.T, sr))
            proc_result = proc(act)
        elif lib == 'madmom.BeatDetectionProcessor':
            histogram_processor = TempoHistogramProcessor(min_bpm=40, max_bpm=200)
            proc = TempoEstimationProcessor(histogram_processor=histogram_processor, fps=100)
            act = rnn_processor(madmom.audio.signal.Signal(audio.T, sr))
            proc_result = proc(act)
        elif lib == 'madmom.BeatDetectionProcessor.consistent':
            proc = madmom.features.beats.BeatDetectionProcessor(fps=100, look_aside=0)
            act = rnn_processor(madmom.audio.signal.Signal(audio.T, sr))
            proc_result = proc(act)
        elif lib == 'madmom.CRFBeatDetectionProcessor':
            proc = madmom.features.beats.CRFBeatDetectionProcessor(fps=100)
            act = rnn_processor(madmom.audio.signal.Signal(audio.T, sr))
            proc_result = proc(act)
        elif lib == 'madmom.CRFBeatDetectionProcessor.constant':
            proc = madmom.features.beats.CRFBeatDetectionProcessor(fps=100, use_factors=True, factors=[0.5, 1, 2])
            act = rnn_processor(madmom.audio.signal.Signal(audio.T, sr))
            proc_result = proc(act)
        elif lib == 'madmom.DBNBeatTrackingProcessor':
            proc = madmom.features.beats.DBNBeatTrackingProcessor(fps=100)
            act = rnn_processor(madmom.audio.signal.Signal(audio.T, sr))
            proc_result = proc(act)
        elif lib == 'madmom.DBNBeatTrackingProcessor.1000':
            proc = madmom.features.beats.DBNBeatTrackingProcessor(fps=100, transition_lambda=1000)
            act = rnn_processor(madmom.audio.signal.Signal(audio.T, sr))
            proc_result = proc(act)
        elif lib == 'madmom.DBNDownBeatTrackingProcessor':
            proc = madmom.features.downbeats.DBNDownBeatTrackingProcessor(beats_per_bar=4, fps=100)
            act = madmom.features.downbeats.RNNDownBeatProcessor()(madmom.audio.signal.Signal(audio.T, sr))
            proc_result = proc(act)
            if proc_result is not None:
                beatmap = proc_result * sr
                beatmap = beatmap[:, 0]  # Take only the first column (beat times)
            else:
                raise ValueError("proc(act) returned None, unable to generate beatmap.")
        elif lib == 'madmom.PatternTrackingProcessor':
            from madmom.models import PATTERNS_BALLROOM
            proc = madmom.features.downbeats.PatternTrackingProcessor(PATTERNS_BALLROOM, fps=50)
            from madmom.audio.spectrogram import LogarithmicSpectrogramProcessor, SpectrogramDifferenceProcessor, MultiBandSpectrogramProcessor
            from madmom.processors import SequentialProcessor
            log = LogarithmicSpectrogramProcessor()
            diff = SpectrogramDifferenceProcessor(positive_diffs=True)
            mb = MultiBandSpectrogramProcessor(crossover_frequencies=[200, 400])
            pre_proc = SequentialProcessor([log, diff, mb])
            act = pre_proc(madmom.audio.signal.Signal(audio.T, sr))
            proc_result = proc(act)
            if proc_result is not None:
                beatmap = proc_result * sr
                beatmap = beatmap[:, 0]
            else:
                raise ValueError("proc(act) returned None, unable to generate beatmap.")
        elif lib == 'madmom.DBNBarTrackingProcessor':
            beats = generate(audio=audio, sr=sr, filename=filename, lib='madmom.DBNBeatTrackingProcessor', caching=caching)
            proc = madmom.features.downbeats.DBNBarTrackingProcessor(beats_per_bar=4, fps=100)
            act = madmom.features.downbeats.RNNBarProcessor()(((madmom.audio.signal.Signal(audio.T, sr)), beats))
            proc_result = proc(act)
            if proc_result is not None:
                beatmap = proc_result * sr
            else:
                raise ValueError("proc(act) returned None, unable to generate beatmap.")
        elif lib == 'librosa':
            import librosa
            beat_frames = librosa.beat.beat_track(y=audio, sr=sr, hop_length=512)
            beatmap = librosa.frames_to_samples(beat_frames)
        else:
            raise ValueError(f"Unsupported library/processor: {lib}")  # Handle unsupported libraries

        if 'madmom' in lib.lower() and proc_result is not None:  # Check only if it's a madmom processor
            beatmap = proc_result * sr

        if proc_result is not None or 'librosa' in lib.lower():  # check if librosa or madmom generated a beatmap
            pass
        else:
            raise ValueError("proc(act) returned None, unable to generate beatmap.")

        # save the beatmap and return
        if caching is True:
            np.savetxt(cacheDir, beatmap.astype(int), fmt='%d')
        if not isinstance(beatmap, np.ndarray):
            beatmap = np.asarray(beatmap, dtype=int)
        else:
            beatmap = beatmap.astype(int)

    if load_settings is True:
        settingsDir = "beat_manipulator/beatmaps/" + ''.join(filename.split('/')[-1]) + "_" + lib + "_" + audio_id + '_settings.txt'
        if os.path.exists(settingsDir):
            with open(settingsDir, 'r') as f:
                settings = f.read().split(',')
            if settings != 'None':
                beatmap = scale(beatmap, settings, log=False)
            if settings != 'None':
                beatmap = shift(beatmap, settings, log=False)
            if settings != 'None':
                beatmap = np.sort(np.absolute(beatmap - int(settings)))

    return beatmap

def save_settings(audio: np.ndarray, filename: str = None, lib: str = 'madmom.BeatDetectionProcessor', scale: float = None, shift: float = None, adjust: int = None, normalized: str = None, log=True, overwrite='ask'):
    if isinstance(overwrite, str): overwrite = overwrite.lower()
    audio_id = hex(len(audio))
    cacheDir = "beat_manipulator/beatmaps/" + ''.join(filename.split('/')[-1]) + "_" + lib + "_" + audio_id + '.txt'
    import os
    assert os.path.exists(cacheDir), f"Beatmap `{cacheDir}` doesn't exist"
    settingsDir = "beat_manipulator/beatmaps/" + ''.join(filename.split('/')[-1]) + "_" + lib + "_" + audio_id + '_settings.txt'

    try:
        a = utils._safer_eval_strict(scale)
        if a == 1: scale = None
    except Exception as e: assert scale is None, f'scale = `{scale}` - Not a valid scale, should be either a number, a math expression, or None: {e}'
    try:
        a = utils._safer_eval_strict(shift)
        if a == 0: shift = None
    except Exception as e: assert shift is None, f'shift = `{shift}` - Not a valid shift: {e}'
    assert isinstance(adjust, int) or adjust is None, f'adjust = `{adjust}` should be int, but it is `{type(adjust)}`'

    if adjust == 0: adjust = None

    if os.path.exists(settingsDir):
        if overwrite == 'ask' or overwrite == 'a':
            what = input(f'`{settingsDir}` already exists. Overwrite (y/n)?: ')
            if not (what.lower() == 'y' or what.lower() == 'yes'): return
        elif not (overwrite == 'true' or overwrite == 'y' or overwrite == 'yes' or overwrite is True): return

    with open(settingsDir, 'w') as f:
        f.write(f'{scale},{shift},{adjust},{normalized}')
    if log is True: print(f"Saved scale = `{scale}`, shift = `{shift}`, adjust = `{adjust}` to `{settingsDir}`")

import numpy
def _safer_eval(string:str) -> float:
    #print(string, end='  ')
    if isinstance(string, str): 
        #print(string, end='     ')
        #print(''.join([i for i in string if i.isdecimal() or i in '.+-*/']), end = '     ')
        string = eval(''.join([i for i in string if i.isdecimal() or i in '.+-*/']))
    #print(string)
    return string

class beatmap:
    def __init__(self, beatmap:list = None, audio = None, samplerate = None, caching = True, log = True, path=None, artist=None, title=None, filename = None):
        self.beatmap = beatmap
        self.audio = audio
        self.samplerate = samplerate
        self.caching = caching
        self.log = log
        self.path = path
        self.artist = artist
        self.title = title
        self.filename = filename

    def __getitem__(self, var):
        return self.beatmap[var]
    
    def __len__(self):
        return len(self.beatmap)
    
    def _toarray(self):
        if isinstance(self.beatmap, list): self.beatmap=numpy.asarray(self.beatmap, dtype=int)
    
    def _add_beat_to_end(self):
        self.beatmap=numpy.abs(numpy.append(self.beatmap, len(self.audio[0])))
        self.beatmap=self.beatmap.astype(int)

    def generate(self, lib='madmom.BeatDetectionProcessor', caching=True, split=None):
        """Creates self.beatmap attribute with a list of positions of beats in samples."""
        if self.log is True: print(f'analyzing beats using {lib}; ', end='')
        #if audio is None and filename is None: (audio, samplerate) = open_audio()
        if caching is True and self.caching is True:
            audio_id=hex(len(self.audio[0]))
            import os
            if not os.path.exists('SavedBeatmaps'):
                os.mkdir('SavedBeatmaps')
            cacheDir="SavedBeatmaps/" + ''.join(self.filename.split('/')[-1]) + "_"+lib+"_"+audio_id+'.txt'
            try: 
                self.beatmap=numpy.loadtxt(cacheDir, dtype=int)
                self.bpm=numpy.average(self.beatmap)/self.samplerate
                if self.log is True: print('loaded cached beatmap.')
                return
            except OSError: 
                if self.log is True:print("beatmap hasn't been generated yet. Generating...")

        if lib.split('.')[0]=='madmom':
            from collections.abc import MutableMapping, MutableSequence
            import madmom
        if lib=='madmom.BeatTrackingProcessor':
            proc = madmom.features.beats.BeatTrackingProcessor(fps=100)
            act = madmom.features.beats.RNNBeatProcessor()(madmom.audio.signal.Signal(self.audio.T, self.samplerate))
            assert len(act)>200, f'Audio file is too short, len={len(act)}'
            self.beatmap= proc(act)*self.samplerate
        if lib=='madmom.BeatTrackingProcessor.constant':
            proc = madmom.features.beats.BeatTrackingProcessor(fps=100, look_ahead=None)
            act = madmom.features.beats.RNNBeatProcessor()(madmom.audio.signal.Signal(self.audio.T, self.samplerate))
            self.beatmap= proc(act)*self.samplerate
        if lib=='madmom.BeatTrackingProcessor.consistent':
            proc = madmom.features.beats.BeatTrackingProcessor(fps=100, look_ahead=None, look_aside=0)
            act = madmom.features.beats.RNNBeatProcessor()(madmom.audio.signal.Signal(self.audio.T, self.samplerate))
            self.beatmap= proc(act)*self.samplerate
        elif lib=='madmom.BeatDetectionProcessor':
            proc = madmom.features.beats.BeatDetectionProcessor(fps=100)
            act = madmom.features.beats.RNNBeatProcessor()(madmom.audio.signal.Signal(self.audio.T, self.samplerate))
            #print(proc, act)
            assert len(act)>200, f'Audio file is too short, len={len(act)}'
            self.beatmap= proc(act)*self.samplerate
        elif lib=='madmom.BeatDetectionProcessor.consistent':
            proc = madmom.features.beats.BeatDetectionProcessor(fps=100, look_aside=0)
            act = madmom.features.beats.RNNBeatProcessor()(madmom.audio.signal.Signal(self.audio.T, self.samplerate))
            self.beatmap= proc(act)*self.samplerate
        elif lib=='madmom.CRFBeatDetectionProcessor':
            proc = madmom.features.beats.CRFBeatDetectionProcessor(fps=100)
            act = madmom.features.beats.RNNBeatProcessor()(madmom.audio.signal.Signal(self.audio.T, self.samplerate))
            self.beatmap= proc(act)*self.samplerate
        elif lib=='madmom.CRFBeatDetectionProcessor.constant':
            proc = madmom.features.beats.CRFBeatDetectionProcessor(fps=100, use_factors=True, factors=[0.5, 1, 2])
            act = madmom.features.beats.RNNBeatProcessor()(madmom.audio.signal.Signal(self.audio.T, self.samplerate))
            self.beatmap= proc(act)*self.samplerate
        elif lib=='madmom.DBNBeatTrackingProcessor':
            proc = madmom.features.beats.DBNBeatTrackingProcessor(fps=100)
            act = madmom.features.beats.RNNBeatProcessor()(madmom.audio.signal.Signal(self.audio.T, self.samplerate))
            self.beatmap= proc(act)*self.samplerate
        elif lib=='madmom.DBNBeatTrackingProcessor.1000':
            proc = madmom.features.beats.DBNBeatTrackingProcessor(fps=100, transition_lambda=1000)
            act = madmom.features.beats.RNNBeatProcessor()(madmom.audio.signal.Signal(self.audio.T, self.samplerate))
            self.beatmap= proc(act)*self.samplerate
        elif lib=='madmom.DBNDownBeatTrackingProcessor':
            proc = madmom.features.downbeats.DBNDownBeatTrackingProcessor(beats_per_bar=[4], fps=100)
            act = madmom.features.downbeats.RNNDownBeatProcessor()(madmom.audio.signal.Signal(self.audio.T, self.samplerate))
            self.beatmap= proc(act)*self.samplerate
            self.beatmap=self.beatmap[:,0]
        elif lib=='madmom.PatternTrackingProcessor': #broken
            from madmom.models import PATTERNS_BALLROOM
            proc = madmom.features.downbeats.PatternTrackingProcessor(PATTERNS_BALLROOM, fps=50)
            from madmom.audio.spectrogram import LogarithmicSpectrogramProcessor, SpectrogramDifferenceProcessor, MultiBandSpectrogramProcessor
            from madmom.processors import SequentialProcessor
            log = LogarithmicSpectrogramProcessor()
            diff = SpectrogramDifferenceProcessor(positive_diffs=True)
            mb = MultiBandSpectrogramProcessor(crossover_frequencies=[270])
            pre_proc = SequentialProcessor([log, diff, mb])
            act = pre_proc(madmom.audio.signal.Signal(self.audio.T, self.samplerate))
            self.beatmap= proc(act)*self.samplerate
            self.beatmap=self.beatmap[:,0]
        elif lib=='madmom.DBNBarTrackingProcessor': #broken
            beats = self.generate(audio=self.audio, samplerate=self.samplerate, filename=self.filename, lib='madmom.DBNBeatTrackingProcessor', caching = caching)
            proc = madmom.features.downbeats.DBNBarTrackingProcessor(beats_per_bar=[4], fps=100)
            act = madmom.features.downbeats.RNNBarProcessor()(((madmom.audio.signal.Signal(self.audio.T, self.samplerate)), beats))
            self.beatmap= proc(act)*self.samplerate
        elif lib=='librosa': #broken in 3.9, works in 3.8
            import librosa
            beat_frames = librosa.beat.beat_track(y=self.audio[0], sr=self.samplerate, hop_length=512)
            self.beatmap = librosa.frames_to_samples(beat_frames[1])
        # elif lib=='BeatNet':
        #     from BeatNet.BeatNet import BeatNet # doesn't seem to work well for some reason
        #     estimator = BeatNet(1, mode='offline', inference_model='DBN', plot=[], thread=False)
        #     beatmap = estimator.process(filename)
        #     beatmap=beatmap[:,0]*self.samplerate
        # elif lib=='jump-reward-inference': # doesn't seem to work well for some reason
        #     from jump_reward_inference.joint_tracker import joint_inference
        #     estimator = joint_inference(1, plot=False)
        #     beatmap = estimator.process(filename)
        #     beatmap=beatmap[:,0]*self.samplerate

        elif lib=='split':
            self.beatmap= list(range(0, len(self.audio[0]), len(self.audio[0])//split))
        elif lib=='stunlocked':
            from . import analyze
            self.beatmap = analyze.detect_bpm(self.audio, self.samplerate)
        if lib.split('.')[0]=='madmom':
            self.beatmap=numpy.absolute(self.beatmap-500)
        if caching is True and self.caching is True: numpy.savetxt(cacheDir, self.beatmap.astype(int), fmt='%d')
        self.bpm=numpy.average(self.beatmap)/self.samplerate
        if isinstance(self.beatmap, list): self.beatmap=numpy.asarray(self.beatmap, dtype=int)
        self.beatmap=self.beatmap.astype(int)

    def scale(self, scale:float):
        if isinstance(scale, str): scale = _safer_eval(scale)
        #print(scale)
        assert scale>0, f"scale should be > 0, your scale is {scale}"
        #print(self.beatmap)
        import math
        if scale!=1:
            if self.log is True: print(f'scale={scale}; ')
            a=0
            b=numpy.array([], dtype=int)
            if scale%1==0:
                while a <len( self.beatmap):
                    #print(a, self.beatmap[int(a)], end=',       ')
                    b=numpy.append(b,self.beatmap[int(a)])
                    a+=scale
                    #print(self.beatmap[int(a)])
            else:
                while a+1 <len( self.beatmap):
                    #print(a,b)
                    b=numpy.append(b, int((1-(a%1))*self.beatmap[math.floor(a)]+(a%1)*self.beatmap[math.ceil(a)]))
                    a+=scale
            self.beatmap=b

    def autoscale(self):
        if self.log is True: print(f'autoscaling; ')
        bpm=(self.beatmap[-1]-self.beatmap[0])/(len(self.beatmap)-1)
        #print('BPM =', (bpm/self.samplerate) * 240, bpm)
        if bpm>=160000: scale=1/8
        elif (bpm)>=80000: scale=1/4
        elif (bpm)>=40000: scale=1/2
        elif (bpm)<=20000: scale=2
        elif (bpm)<=10000: scale=4
        elif (bpm)<=5000: scale=8
        self.scale(scale)    

    def autoinsert(self):
        if self.log is True: print(f'autoinserting; ')
        diff=(self.beatmap[1]-self.beatmap[0])
        a=0
        while diff<self.beatmap[0] and a<100:
            self.beatmap=numpy.insert(self.beatmap, 0, self.beatmap[0]-diff)
            a+=1

    def shift(self, shift: float):
        if isinstance(shift, str): shift = _safer_eval(shift)
        if shift!=0 and self.log is True: print(f'shift={shift}; ')
        elif shift==0: return
        if shift<0:
            shift=-shift # so that floor division works correctly
            # add integer number of beats to the start
            if shift >= 1: self.beatmap=numpy.insert(self.beatmap, 0, list(i+1 for i in range(int(shift//1))))
            if shift%1!=0:
                # shift by modulus from the end
                shift=shift%1
                for i in reversed(range(len(self.beatmap))):
                    if i==0: continue
                    #print(i, ', ',self.beatmap[i], '-', shift, '* (', self.beatmap[i], '-', self.beatmap[i-1],') =', self.beatmap[i] - shift * (self.beatmap[i] - self.beatmap[i-1]))
                    self.beatmap[i] = int(self.beatmap[i] - shift * (self.beatmap[i] - self.beatmap[i-1]))
        
        elif shift>0:
            # remove integer number of beats from the start
            if shift >= 1: self.beatmap=self.beatmap[int(shift//1):]
            if shift%1!=0:
                # shift by modulus
                shift=shift%1
                for i in range(len(self.beatmap)-int(shift)-1):
                    #print(self.beatmap[i], '+', shift, '* (', self.beatmap[i+1], '-', self.beatmap[i],') =', self.beatmap[i] + shift * (self.beatmap[i+1] - self.beatmap[i]))
                    self.beatmap[i] = int(self.beatmap[i] + shift * (self.beatmap[i+1] - self.beatmap[i]))
        
        self.beatmap=sorted(list(self.beatmap))
        while True:
            n,done=0,[]
            for i in range(len(self.beatmap)):
                if self.beatmap.count(self.beatmap[i])>1 and i not in done:
                    self.beatmap[i]+=1
                    n+=1
                    done.append(i)
            if n==0: break
        self.beatmap=sorted(list(self.beatmap))

    def cut(self, start=0, end=None):
        if start!=0 or end is not None and self.log is True: print(f'start={start}; end={end}; ')
        start*=self.samplerate
        self.beatmap=self.beatmap[self.beatmap>=start].astype(int)
        if end is not None: self.beatmap=self.beatmap[self.beatmap<=end].astype(int)

class hitmap(beatmap):
    def generate(self, lib='madmom.MultiModelSelectionProcessor', caching=True):
        if self.log is True: print(f'analyzing hits using {lib}; ')
        self.hitlib=lib
        """Finds positions of actual instrument/drum hits."""
        if caching is True and self.caching is True:
            audio_id=hex(len(self.audio[0]))
            import os
            if not os.path.exists('SavedBeatmaps'):
                os.mkdir('SavedBeatmaps')
            cacheDir="SavedBeatmaps/" + ''.join(self.filename.split('/')[-1]) + "_"+lib+"_"+audio_id+'.txt'
            try: 
                cached=False
                self.beatmap=numpy.loadtxt(cacheDir)
                cached=True
            except OSError: cached=False
        if cached is False:
            if lib=='madmom.RNNBeatProcessor': #broken
                import madmom
                proc = madmom.features.beats.RNNBeatProcessor()
                self.beatmap = proc(madmom.audio.signal.Signal(self.audio.T, self.samplerate))
            elif lib=='madmom.MultiModelSelectionProcessor':
                import madmom
                proc = madmom.features.beats.RNNBeatProcessor(post_processor=None)
                predictions = proc(madmom.audio.signal.Signal(self.audio.T, self.samplerate))
                mm_proc = madmom.features.beats.MultiModelSelectionProcessor(num_ref_predictions=None)
                self.beatmap= mm_proc(predictions)*self.samplerate
                self.beatmap/= numpy.max(self.beatmap)
            if caching is True and self.caching is True: numpy.savetxt(cacheDir, self.beatmap)
    
    def osu(self, difficulties = [0.2, 0.1, 0.08, 0.06, 0.04, 0.02, 0.01, 0.005]):
        if self.log is True: print(f'generating osu file')
        def _process(self, threshold):
            hitmap=[]
            actual_samplerate=int(self.samplerate/100)
            beat_middle=int(actual_samplerate/2)
            for i in range(len(self.beatmap)):
                if self.beatmap[i]>threshold: hitmap.append(i*actual_samplerate + beat_middle)
            hitmap=numpy.asarray(hitmap)
            clump=[]
            for i in range(len(hitmap)-1):
                #print(i, abs(self.beatmap[i]-self.beatmap[i+1]), clump)
                if abs(hitmap[i] - hitmap[i+1]) < self.samplerate/16: clump.append(i)
                elif clump!=[]: 
                    clump.append(i)
                    actual_time=hitmap[clump[0]]
                    hitmap[numpy.array(clump)]=0
                    #print(self.beatmap)
                    hitmap[clump[0]]=actual_time
                    clump=[]
            
            hitmap=hitmap[hitmap!=0]
            return hitmap
        
        osufile=lambda title,artist,version: ("osu file format v14\n"
        "\n"
        "[General]\n"
        f"AudioFilename: {self.path.split('/')[-1]}\n"
        "AudioLeadIn: 0\n"
        "PreviewTime: -1\n"
        "Countdown: 0\n"
        "SampleSet: Normal\n"
        "StackLeniency: 0.5\n"
        "Mode: 0\n"
        "LetterboxInBreaks: 0\n"
        "WidescreenStoryboard: 0\n"
        "\n"
        "[Editor]\n"
        "DistanceSpacing: 1.1\n"
        "BeatDivisor: 4\n"
        "GridSize: 8\n"
        "TimelineZoom: 1.6\n"
        "\n"
        "[Metadata]\n"
        f"Title:{title}\n"
        f"TitleUnicode:{title}\n"
        f"Artist:{artist}\n"
        f"ArtistUnicode:{artist}\n"
        f'Creator:{self.hitlib} + BeatManipulator\n'
        f'Version:{version} {self.hitlib}\n'
        'Source:\n'
        'Tags:BeatManipulator\n'
        'BeatmapID:0\n'
        'BeatmapSetID:-1\n'
        '\n'
        '[Difficulty]\n'
        'HPDrainRate:4\n'
        'CircleSize:4\n'
        'OverallDifficulty:7.5\n'
        'ApproachRate:10\n'
        'SliderMultiplier:3.3\n'
        'SliderTickRate:1\n'
        '\n'
        '[Events]\n'
        '//Background and Video events\n'
        '//Break Periods\n'
        '//Storyboard Layer 0 (Background)\n'
        '//Storyboard Layer 1 (Fail)\n'
        '//Storyboard Layer 2 (Pass)\n'
        '//Storyboard Layer 3 (Foreground)\n'
        '//Storyboard Layer 4 (Overlay)\n'
        '//Storyboard Sound Samples\n'
        '\n'
        '[TimingPoints]\n'
        '0,140.0,4,1,0,100,1,0\n'
        '\n'
        '\n'
        '[HitObjects]\n')
        # remove the clumps
        #print(self.beatmap)

        #print(self.beatmap)

        
        #print(len(osumap))
        #input('banana')
        import shutil, os
        if os.path.exists('BeatManipulator_TEMP'): shutil.rmtree('BeatManipulator_TEMP')
        os.mkdir('BeatManipulator_TEMP')
        hitmap=[]
        import random
        for difficulty in difficulties:
            for i in range(4):
                #print(i)
                this_difficulty=_process(self, difficulty)
            hitmap.append(this_difficulty)
        for k in range(len(hitmap)):
            osumap=numpy.vstack((hitmap[k],numpy.zeros(len(hitmap[k])),numpy.zeros(len(hitmap[k])))).T
            difficulty= difficulties[k]
            for i in range(len(osumap)-1):
                if i==0:continue
                dist=(osumap[i,0]-osumap[i-1,0])*(1-(difficulty**0.3))
                if dist<1000: dist=0.005
                elif dist<2000: dist=0.01
                elif dist<3000: dist=0.015
                elif dist<4000: dist=0.02
                elif dist<5000: dist=0.25
                elif dist<6000: dist=0.35
                elif dist<7000: dist=0.45
                elif dist<8000: dist=0.55
                elif dist<9000: dist=0.65
                elif dist<10000: dist=0.75
                elif dist<12500: dist=0.85
                elif dist<15000: dist=0.95
                elif dist<20000: dist=1
                #elif dist<30000: dist=0.8
                prev_x=osumap[i-1,1]
                prev_y=osumap[i-1,2]
                if prev_x>0: prev_x=prev_x-dist*0.1
                elif prev_x<0: prev_x=prev_x+dist*0.1
                if prev_y>0: prev_y=prev_y-dist*0.1
                elif prev_y<0: prev_y=prev_y+dist*0.1
                dirx=random.uniform(-dist,dist)
                diry=dist-abs(dirx)*random.choice([-1, 1])
                if abs(prev_x+dirx)>1: dirx=-dirx
                if abs(prev_y+diry)>1: diry=-diry
                x=prev_x+dirx
                y=prev_y+diry
                #print(dirx,diry,x,y)
                #print(x>1, x<1, y>1, y<1)
                if x>1: x=0.8
                if x<-1: x=-0.8
                if y>1: y=0.8
                if y<-1: y=-0.8
                #print(dirx,diry,x,y)
                osumap[i,1]=x
                osumap[i,2]=y

            osumap[:,1]*=300
            osumap[:,1]+=300
            osumap[:,2]*=180
            osumap[:,2]+=220

            file=osufile(self.artist, self.title, difficulty)
            for j in osumap:
                #print('285,70,'+str(int(int(i)*1000/self.samplerate))+',1,0')
                file+=f'{int(j[1])},{int(j[2])},{str(int(int(j[0])*1000/self.samplerate))},1,0\n'
            with open(f'BeatManipulator_TEMP/{self.artist} - {self.title} [BeatManipulator {difficulty} {self.hitlib}].osu', 'x', encoding="utf-8") as f:
                f.write(file)

    def autoinsert(): raise NotImplementedError("autoinserting won't work on hitmaps")
    def autoscale(): raise NotImplementedError("autoscale won't work on hitmaps")

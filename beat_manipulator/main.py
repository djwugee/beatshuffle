import numpy
numpy.set_printoptions(suppress=True)
from .beatmap import beatmap, hitmap
from .image import spectogram, beat_image

def _safer_eval(string:str) -> float:
    if isinstance(string, str): 
        #print(''.join([i for i in string if i.isdecimal() or i in '.+-*/']))
        string = eval(''.join([i for i in string if i.isdecimal() or i in '.+-*/']))
    return string

def open_audio(filename=None, lib='auto') -> numpy.ndarray:
    """Opens audio from path, returns (audio, samplerate) tuple.
    
    Audio is returned as an array with normal volume range between -1, 1.
    
    Example of returned audio: 
    
    [
        [0.35, -0.25, ... -0.15, -0.15], 
    
        [0.31, -0.21, ... -0.11, -0.07]
    ]"""
    if filename is None:
        from tkinter.filedialog import askopenfilename
        filename = askopenfilename(title='select song', filetypes=[("mp3", ".mp3"),("wav", ".wav"),("flac", ".flac"),("ogg", ".ogg"),("wma", ".wma")])
    filename=filename.replace('\\', '/')
    if lib=='pedalboard.io':
        import pedalboard.io
        with pedalboard.io.AudioFile(filename) as f:
            audio = f.read(f.frames)
            samplerate = f.samplerate
    elif lib=='librosa':
        import librosa
        audio, samplerate = librosa.load(filename, sr=None, mono=False)
    elif lib=='soundfile':
        import soundfile
        audio, samplerate = soundfile.read(filename)
        audio=audio.T
    elif lib=='madmom':
        import madmom
        audio, samplerate = madmom.io.audio.load_audio_file(filename, dtype=float)
        audio=audio.T
    # elif lib=='pydub':
    #     from pydub import AudioSegment
    #     song=AudioSegment.from_file(filename)
    #     audio = song.get_array_of_samples()
    #     samplerate=song.frame_rate
    #     print(audio)
    #     print(filename)
    elif lib=='auto':
        for i in ('madmom', 'soundfile', 'librosa', 'pedalboard.io'):
            try: 
                audio,samplerate=open_audio(filename, i)
                break
            except Exception as e:
                print(f'open_audio with {i}: {e}')
    if len(audio)<2: audio=[audio]
    return audio,samplerate


def _outputfilename(output, filename, suffix=' (beatswap)', ext='mp3'):
    if not (output.lower().endswith('.mp3') or output.lower().endswith('.wav') or output.lower().endswith('.flac') or output.lower().endswith('.ogg') or 
            output.lower().endswith('.aac') or output.lower().endswith('.ac3') or output.lower().endswith('.aiff')  or output.lower().endswith('.wma')):
                return output+'.'.join(''.join(filename.split('/')[-1]).split('.')[:-1])+suffix+'.'+ext
    
class song:
    def __init__(self, path:str=None, audio:numpy.array=None, samplerate:int=None, bmap:list=None, caching=True, filename=None, copied=False, log=True):
        """song can be loaded from path to an audio file, or from a list/numpy array and samplerate. Audio array should have values from -1 to 1, multiple channels should be stacked vertically. Optionally you can provide your own beat map.
        
        Song object has the following attributes:

        path - file system path to load the audio file from. Can be absolute or relative.
        
        audio - either a numpy array with shape=(channels, values) or a list with two lists. Audio is converted to list for certain operations to improve performance.
        
        samplerate - integer, for example 44100. Determined automatically when audio is loaded from a path.

        bmap - list of integers, with positions of each beat in samples.

        caching = True - if True, generated beatmaps will be saved to SavedBeatmaps folder and loaded when the same audio file is opened again, instead of generating beatmap each time.

        log = True - if True, minimal info about all operations will be printed.
        """
        assert not (audio is not None and samplerate is None), 'If audio is provided, samplerate should be provided as well, for example samplerate=44100'
        
        self.audio=audio
        self.samplerate=samplerate
        
        # ask for a path if audio isn't specified
        if path is None and filename is None:
            if audio is None:
                from tkinter.filedialog import askopenfilename
                self.path = askopenfilename(title='select song')
            else:
                # generate unique identifier for storing beatmap cache
                audio_id = numpy.sum(audio[0][1000:2000]) if len(audio<2000) else numpy.sum(audio[1000:2000])
                self.filename = 'unknown ' + str(hex(int(audio_id))) + ' ' + str(hex(int((audio_id%1)*(10**18))))
                self.path = self.filename
                print(self.filename)
        else: 
            if path is None: self.path=filename
            else: self.path=path

        # load from zip
        if self.path.lower().endswith('.zip'): 
            import shutil,os
            if os.path.exists('BeatManipulator_TEMP'): shutil.rmtree('BeatManipulator_TEMP')
            os.mkdir('BeatManipulator_TEMP')
            shutil.unpack_archive(self.path, 'BeatManipulator_TEMP')
            for root,dirs,files in os.walk('BeatManipulator_TEMP'):
                for fname in files:
                    if fname.lower().endswith('.mp3') or fname.lower().endswith('.wav') or fname.lower().endswith('.ogg') or fname.lower().endswith('.flac'):
                        self.audio, self.samplerate=open_audio(root.replace('\\','/')+'/'+fname)
                        stop=True
                        break
                if stop is True: break
            shutil.rmtree('BeatManipulator_TEMP')
    
        # open audio from path
        if self.audio is None or self.samplerate is None:
            self.audio, self.samplerate=open_audio(self.path)

        # mono to stereo
        if len(self.audio)>16:
            self.audio=numpy.asarray((self.audio,self.audio))

        # stuff
        self.path=self.path.replace('\\', '/')
        if filename is None: self.filename=self.path.split('/')[-1]
        else: self.filename=filename.replace('\\', '/').split('/')[-1]
        self.samplerate=int(self.samplerate)

        # artist,  title
        if ' - ' in self.path.split('/')[-1]:
            self.artist = self.path.split('/')[-1].split(' - ')[0]
            self.title= '.'.join(self.path.split('/')[-1].split(' - ')[1].split('.')[:-1])
        elif path is not None or filename is not None:
            self.title=''.join(self.path.split('/')[-1].split('.')[:-1])
            self.artist=None
        else:
            self.title = None
            self.artist = None
        self.caching=caching
        self.log=log
        if copied is False and self.log is True: 
            if self.artist is not None or self.title is not None: print(f'Loaded {self.artist} - {self.title}; ')
            elif filename is not None: print(f'Loaded {self.filename}; ')
            elif path is not None: print(f'Loaded {self.path}; ')
            else: print(f'Loaded audio file; ')
        self.audio_isarray = True
        
        if isinstance(bmap, beatmap): self.beatmap=bmap
        else: self.beatmap = beatmap(beatmap = bmap, audio= self.audio, samplerate=self.samplerate, filename=self.filename, caching = caching, log=log, path=self.path, artist=self.artist, title=self.title)
        self.hitmap = hitmap(audio= self.audio, samplerate=self.samplerate, filename=self.filename, caching = caching, log=log, path=self.path, artist=self.artist, title=self.title)
        self.spectogram = spectogram(audio=self.audio, samplerate=self.samplerate, beatmap=self.beatmap, log=self.log)
        self.beat_image = beat_image(audio=self.audio, samplerate=self.samplerate, beatmap=self.beatmap, log=self.log)
    
    @property
    def bm(self):
        return self.beatmap.beatmap
    
    @property
    def hm(self):
        return self.hitmap.beatmap
    
    def _printlog(self, string, end=None, force = False, forcei = False):
        if (self.log is True or force is True) and forcei is False:
            if end is None: print(string)
            else:print(string,end=end)
    
    def _audio_tolist(self, force = True):
        if self.audio_isarray:
            self.audio = self.audio.tolist()
            self.audio_isarray = False
        elif force is True: 
            self.audio = self.audio.tolist()
            self.audio_isarray = False

    def _audio_toarray(self, force = True):
        if not self.audio_isarray:
            self.audio = numpy.asarray(self.audio)
            self.audio_isarray = True
        elif force is True: 
            self.audio = numpy.asarray(self.audio)
            self.audio_isarray = True
            
    def _update(self):
        self.beatmap.audio = self.audio
        self.hitmap.audio = self.audio
        self.spectogram.audio = self.audio
        self.beat_image.audio = self.audio
        self.beat_image.beatmap = self.bm

    def write(self, output:str, lib:str='auto', libs=('pedalboard.io', 'soundfile')):
        """"writes audio to path specified by output. Path should end with file extension, for example `folder/audio.mp3`"""
        self._audio_toarray()
        if lib!='auto': self._printlog(f'writing {output} with {lib}')
        if lib=='pedalboard.io':
            #print(audio)
            import pedalboard.io
            with pedalboard.io.AudioFile(output, 'w', self.samplerate, self.audio.shape[0]) as f:
                f.write(self.audio)
        elif lib=='soundfile':
            audio=self.audio.T
            import soundfile
            soundfile.write(output, audio, self.samplerate)
            del audio
        elif lib=='auto':
            for i in libs:
                try: 
                    self.write(output, i)
                    break
                except Exception as e:
                    print(e)

        # elif lib=='pydub':
        #     from pydub import AudioSegment
        #     song = AudioSegment(self.audio.tobytes(), frame_rate=self.samplerate, sample_width=2, channels=2)
        #     format = output.split('.')[-1]
        #     if len(format) > 4: 
        #         format='mp3' 
        #         output = output + '.' + format
        #     song.export(output, format=format)

    # def generate_beatmap(self, lib='madmom.BeatDetectionProcessor', split=None):
    #     self.beatmap = beatmap(beatmap=None, samplerate=self.samplerate, length=len(self.audio[0]),caching=self.caching,log=self.log)
    #     self.beatmap.generate(audio=self.audio, samplerate=self.samplerate, lib=lib, caching=self.caching, split=split, filename=self.filename)

    # def generate_hitmap(self, lib='madmom.BeatDetectionProcessor'):
    #     self.hitmap=hitmap(beatmap=None, samplerate=self.samplerate, length = len(self.audio), caching=self.caching, log=self.log)
    #     self.hitmap.generate(audio=self.audio, samplerate=self.samplerate, lib=lib, caching=self.caching, filename=self.filename)

    def generate_osu_beatmap(self, difficulties = [0.2, 0.1, 0.08, 0.06, 0.04, 0.02, 0.01, 0.005]):
        self.hitmap.osu(self, difficulties = difficulties)
        import shutil, os
        if self.path is not None: 
            shutil.copyfile(self.path, 'BeatManipulator_TEMP/'+self.path.split('/')[-1])
        else: self.write('BeatManipulator_TEMP/audio.mp3')
        shutil.make_archive('BeatManipulator_TEMP', 'zip', 'BeatManipulator_TEMP')
        os.rename('BeatManipulator_TEMP.zip', _outputfilename('', self.path, '_'+self.hm, 'osz'))
        shutil.rmtree('BeatManipulator_TEMP')

    def autotrim(self):
        self._printlog(f'autotrimming; ')
        n=0
        for i in self.audio[0]:
            if i>=0.0001:break
            n+=1
        if type(self.audio) is tuple or list: self.audio = numpy.asarray(self.audio)
        self.audio = numpy.asarray([self.audio[0,n:], self.audio[1,n:]])
        if self.bm is not None: 
            self.beatmap.beatmap=numpy.absolute(self.beatmap.beatmap-n)
        if self.hm is not None: 
            print(self.hm)
            self.hitmap.beatmap=numpy.absolute(self.hitmap.beatmap-n)
        self._update()

    def beatswap(self, pattern: str, sep=',', smoothing=40, smoothing_mode='replace'):
        import math, numpy
        # get pattern size
        size=0    
        #cut processing??? not worth it, it is really fast anyways
        pattern=pattern.replace(' ', '').split(sep)
        self._printlog(f"beatswapping with {' '.join(pattern)}; ")
        for j in pattern:
            s=''
            if '?' not in j:
                for i in j:
                    if i.isdigit() or i=='.' or i=='-' or i=='/' or i=='+' or i=='%': s=str(s)+str(i)
                    elif i==':':
                        if s=='': s='0'
                        #print(s, _safer_eval(s))
                        size=max(math.ceil(float(_safer_eval(s))), size)
                        s=''
                    elif s!='': break
                if s=='': s='0'
            if s=='': s='0'
            size=max(math.ceil(float(_safer_eval(s))), size)

        self._audio_tolist()
        self.beatmap._toarray()
        # turns audio into a tuple with L and R channels
        self.audio=(self.audio[0], self.audio[1])

        # adds the part before the first beat
        result=(self.audio[0][:self.beatmap[0]],self.audio[1][:self.beatmap[0]])
        beat=numpy.asarray([[],[]])

        # size, iterations are integers
        size=int(max(size//1, 1))
    
        self.beatmap._add_beat_to_end()

        iterations=int(len(self.beatmap)//size)
        
        if 'random' in pattern[0].lower():
            import random
            for i in range(len(self.beatmap)):

                choice=random.randint(1,len(self.beatmap)-1)
                for a in range(len(self.audio)): 
                    try:
                        beat=self.audio[a][self.beatmap[choice-1]:self.beatmap[choice]-smoothing]
                        if smoothing>0: result[a].extend(numpy.linspace(result[a][-1],beat[0],smoothing))
                        result[a].extend(beat)
                    except IndexError: pass
            self.audio = result
            return
        
        if 'reverse' in pattern[0].lower():
            for a in range(len(self.audio)): 
                for i in list(reversed(range(len(self.beatmap))))[:-1]:
                    try:
                        beat=self.audio[a][self.beatmap[i-1]:self.beatmap[i]-smoothing]
                        #print(self.beatmap[i-1],self.beatmap[i])
                        #print(result[a][-1], beat[0])
                        if smoothing>0: result[a].extend(numpy.linspace(result[a][-1],beat[0],smoothing))
                        result[a].extend(beat)
                    except IndexError: pass

            self.audio = result
            return
                    
        #print(len(result[0]))
        def beatswap_getnum(i: str, c: str):
            if c in i:
                try: 
                    x=i.index(c)+1
                    z=''
                    try:
                        while i[x].isdigit() or i[x]=='.' or i[x]=='-' or i[x]=='/' or i[x]=='+' or i[x]=='%': 
                            z+=i[x]
                            x+=1
                        return z
                    except IndexError:
                        return z
                except ValueError: return None

        #print(len(self.beatmap), size, iterations)
        # processing
        for j in range(iterations+1):
            for i in pattern:
                if '!' not in i:
                    n,s,st,reverse,z=0,'',None,False,None
                    for c in i:
                        n+=1
                        #print('c =', s, ',  st =', st, ',   s =', s, ',   n =,',n)

                        # Get the character
                        if c.isdigit() or c=='.' or c=='-' or c=='/' or c=='+' or c=='%': 
                            s=str(s)+str(c)
                        
                        # If character is : - get start
                        elif s!='' and c==':':
                            #print ('Beat start:',s,'=', _safer_eval(s),'=',int(_safer_eval(s)//1), '+',j,'*',size,'    =',int(_safer_eval(s)//1)+j*size, ',   mod=',_safer_eval(s)%1)
                            try: st=self.beatmap[int(_safer_eval(s)//1)+j*size ] + _safer_eval(s)%1* (self.beatmap[int(_safer_eval(s)//1)+j*size +1] - self.beatmap[int(_safer_eval(s)//1)+j*size])
                            except IndexError: break
                            s=''
                        
                        # create a beat
                        if s!='' and (n==len(i) or not(c.isdigit() or c=='.' or c=='-' or c=='/' or c=='+' or c=='%')):

                            # start already exists
                            if st is not None:
                                #print ('Beat end:  ',s,'=', _safer_eval(s),'=',int(_safer_eval(s)//1), '+',j,'*',size,'    =',int(_safer_eval(s)//1)+j*size, ',   mod=',_safer_eval(s)%1)
                                try:
                                    s=self.beatmap[int(_safer_eval(s)//1)+j*size ] + _safer_eval(s)%1* (self.beatmap[int(_safer_eval(s)//1)+j*size +1] - self.beatmap[int(_safer_eval(s)//1)+j*size])
                                    #print(s)
                                except IndexError: break
                            else:
                                # start doesn't exist
                                #print ('Beat start:',s,'=', _safer_eval(s),'=',int(_safer_eval(s)//1), '+',j,'*',size,'- 1 =',int(_safer_eval(s)//1)+j*size,   ',   mod=',_safer_eval(s)%1)
                                #print ('Beat end:  ',s,'=', _safer_eval(s),'=',int(_safer_eval(s)//1), '+',j,'*',size,'    =',int(_safer_eval(s)//1)+j*size+1, ',   mod=',_safer_eval(s)%1)
                                try:
                                    st=self.beatmap[int(_safer_eval(s)//1)+j*size-1 ] + _safer_eval(s)%1* (self.beatmap[int(_safer_eval(s)//1)+j*size +1] - self.beatmap[int(_safer_eval(s)//1)+j*size])
                                    s=self.beatmap[int(_safer_eval(s)//1)+j*size ] + _safer_eval(s)%1* (self.beatmap[int(_safer_eval(s)//1)+j*size +1] - self.beatmap[int(_safer_eval(s)//1)+j*size])
                                except IndexError: break
                            
                            if st>s: 
                                s, st=st, s
                                reverse=True

                            # create the beat
                            if len(self.audio)>1: 
                                if smoothing_mode=='add': beat=numpy.asarray([self.audio[0][int(st):int(s)],self.audio[1][int(st):int(s)]])
                                else: beat=numpy.asarray([self.audio[0][int(st):int(s)-smoothing],self.audio[1][int(st):int(s)-smoothing]])
                            else:
                                if smoothing_mode=='add': beat=numpy.asarray([self.audio[0][int(st):int(s)]])
                                else: beat=numpy.asarray([self.audio[0][int(st):int(s)-smoothing]])

                            # process the beat
                            # channels
                            z=beatswap_getnum(i,'c')
                            if z is not None:
                                if z=='': beat[0],beat[1]=beat[1],beat[0]
                                elif _safer_eval(z)==0:beat[0]*=0
                                else:beat[1]*=0

                            # volume
                            z=beatswap_getnum(i,'v')
                            if z is not None:
                                if z=='': z='0'
                                beat*=_safer_eval(z)

                            z=beatswap_getnum(i,'t')
                            if z is not None:
                                if z=='': z='2'
                                beat**=1/_safer_eval(z)

                            # speed
                            z=beatswap_getnum(i,'s')
                            if z is not None:
                                if z=='': z='2'
                                z=_safer_eval(z)
                                if z<1: 
                                    beat=numpy.asarray((numpy.repeat(beat[0],int(1//z)),numpy.repeat(beat[1],int(1//z))))
                                else:
                                    beat=numpy.asarray((beat[0,::int(z)],beat[1,::int(z)]))
                            
                            # bitcrush
                            z=beatswap_getnum(i,'b')
                            if z is not None:
                                if z=='': z='3'
                                z=1/_safer_eval(z)
                                if z<1: beat=beat*z
                                beat=numpy.around(beat, max(int(z), 1))
                                if z<1: beat=beat/z

                            # downsample
                            z=beatswap_getnum(i,'d')
                            if z is not None:
                                if z=='': z='3'
                                z=int(_safer_eval(z))
                                beat=numpy.asarray((numpy.repeat(beat[0,::z],z),numpy.repeat(beat[1,::z],z)))

                            # convert to list
                            beat=beat.tolist()

                            # effects with list
                            # reverse
                            if ('r' in i and reverse is False) or (reverse is True and 'r' not in i):
                                beat=(beat[0][::-1],beat[1][::-1] )

                            # add beat to the result
                            for a in range(len(self.audio)): 
                                #print('Adding beat... a, s, st:', a, s, st, sep=',  ')
                                #print(result[a][-1])
                                #print(beat[a][0])
                                try:
                                    if smoothing>0: result[a].extend(numpy.linspace(result[a][-1],beat[a][0],smoothing))
                                    result[a].extend(beat[a])
                                except IndexError: pass
                                #print(len(result[0]))

                            #   
                            break

        self.audio = result
        self._update()

    def beatsample(self, audio2, shift=0):
        self._printlog(f'beatsample; ')
        try: l=len(audio2[0])
        except (TypeError, IndexError): 
            l=len(audio2)
            audio2=numpy.vstack((audio2,audio2))
        for i in range(len(self.beatmap)):
            #print(self.beatmap[i])
            try: self.audio[:,int(self.beatmap[i]) + int(float(shift) * (int(self.beatmap[i+1])-int(self.beatmap[i]))) : int(self.beatmap[i])+int(float(shift) * (int(self.beatmap[i+1])-int(self.beatmap[i])))+int(l)]+=audio2
            except (IndexError, ValueError): pass
        self._update()

    def hitsample(self, audio2=None):
        self._printlog(f'hitsample; ')
        from . import generate
        if audio2 is None:audio2=generate.saw(0.05, 1000, self.samplerate)
        try: l=len(audio2[0])
        except (TypeError, IndexError): 
            l=len(audio2)
            audio2=numpy.vstack((audio2,audio2))
        #print(self.audio)
        self.audio=numpy.array(self.audio).copy()
        #print(self.audio)
        for i in range(len(self.hitmap)):
            try: 
                #print('before', self.audio[:,int(self.hitmap[i])])
                self.audio[:,int(self.hitmap[i]) : int(self.hitmap[i]+l)]+=audio2
                #print('after ', self.audio[:,int(self.hitmap[i])])
                #print(self.hitmap[i])
            except (IndexError, ValueError): pass
        self._update()

    def sidechain(self, audio2, shift=0, smoothing=40):
        self._printlog(f'sidechain; ')
        try: l=len(audio2[0])
        except (TypeError, IndexError): 
            l=len(audio2)
            audio2=numpy.vstack((audio2,audio2))
        for i in range(len(self.beatmap)):
            try: self.audio[:,int(self.beatmap[i])-smoothing + int(float(shift) * (int(self.beatmap[i+1])-int(self.beatmap[i]))) : int(self.beatmap[i])-smoothing+int(float(shift) * (int(self.beatmap[i+1])-int(self.beatmap[i])))+int(l)]*=audio2
            except (IndexError, ValueError): break
        self._update()

    def quick_beatswap(self, output:str='', pattern:str=None, scale:float=1, shift:float=0, start:float=0, end:float=None, autotrim:bool=True, autoscale:bool=False, autoinsert:bool=False, suffix:str=' (beatswap)', lib:str='madmom.BeatDetectionProcessor', log = True):
        """Generates beatmap if it isn't generated, applies beatswapping to the song and writes the processed song it next to the .py file. If you don't want to write the file, set output=None
        
        output: can be a relative or an absolute path to a folder or to a file. Filename will be created from the original filename + a suffix to avoid overwriting. If path already contains a filename which ends with audio file extension, such as .mp3, that filename will be used.
        
        pattern: the beatswapping pattern.
        
        scale: scales the beatmap, for example if generated beatmap is two times faster than the song you can slow it down by putting 0.5.
        
        shift: shifts the beatmap by this amount of unscaled beats
        
        start: position in seconds, beats before the position will not be manipulated
        
        end: position in seconds, same. Set to None by default.
        
        autotrim: trims silence in the beginning for better beat detection, True by default
        
        autoscale: scales beats so that they are between 10000 and 20000 samples long. Useful when you are processing a lot of files with similar BPMs, False by default.
        
        autoinsert: uses distance between beats and inserts beats at the beginning at that distance if possible. Set to False by default, sometimes it can fix shifted beatmaps and sometimes can add unwanted shift.
        
        suffix: suffix that will be appended to the filename
        
        lib: beat detection library"""
        if log is False and self.log is True: 
            self.log = False
            self.beatmap.log=False
            log_disabled = True
        else: log_disabled = False
        self._printlog('___')
        scale = _safer_eval(scale)
        shift = _safer_eval(shift)
        if self.bm is None: self.beatmap.generate(lib=lib)
        if autotrim is True: self.autotrim()
        save=self.beatmap.beatmap.copy()
        if autoscale is True: self.beatmap.autoscale()
        if shift!=0: self.beatmap.shift(shift)
        if scale!=1: self.beatmap.scale(scale)
        if autoinsert is True: self.beatmap.autoinsert()
        if start!=0 or end is not None: self.beatmap.cut(start, end)
        self._printlog(f'pattern = {pattern}')
        if 'test' in pattern.lower():
            self.audio*=0.7
            self.beatmap.beatmap=save.copy()
            if autoinsert is True: self.beatmap.autoinsert()
            if start!=0 or end is not None: self.beatmap.cut(start, end)
            audio2, samplerate2=open_audio('samples/cowbell.flac')
            song.quick_beatsample(self, output=None, audio2=list(i[::3] for i in audio2), scale=8*scale, shift=0+shift, log=log)
            song.quick_beatsample(self, output=None, audio2=list(i[::2] for i in audio2), scale=8*scale, shift=1*scale+shift, log=log)
            song.quick_beatsample(self, output=None, audio2=audio2, scale=8*scale, shift=2*scale+shift, log=log)
            song.quick_beatsample(self, output=None, audio2=numpy.repeat(audio2,2,axis=1), scale=8*scale, shift=3*scale+shift, log=log)
            song.quick_beatsample(self, output=None, audio2=numpy.repeat(audio2,3,axis=1), scale=8*scale, shift=4*scale+shift, log=log)
            song.quick_beatsample(self, output=None, audio2=numpy.repeat(audio2,2,axis=1), scale=8*scale, shift=5*scale+shift, log=log)
            song.quick_beatsample(self, output=None, audio2=audio2, scale=8*scale, shift=6*scale+shift, log=log)
            song.quick_beatsample(self, output=None, audio2=list(i[::2] for i in audio2), scale=8*scale, shift=7*scale+shift, log=log)

        else: self.beatswap(pattern)

        if output is not None:
            if not (output.lower().endswith('.mp3') or output.lower().endswith('.wav') or output.lower().endswith('.flac') or output.lower().endswith('.ogg') or 
            output.lower().endswith('.aac') or output.lower().endswith('.ac3') or output.lower().endswith('.aiff')  or output.lower().endswith('.wma')):
                output=output+'.'.join(''.join(self.path.split('/')[-1]).split('.')[:-1])+suffix+'.mp3'
            self.write(output)

        self.beatmap.beatmap=save.copy()
        if log_disabled is True: 
            self.log = True
            self.beatmap.log=True


    def quick_sidechain(self, output:str='', audio2:numpy.array=None, scale:float=1, shift:float=0, start:float=0, end:float=None, autotrim:bool=True, autoscale:bool=False, autoinsert:bool=False, filename2:str=None, suffix:str=' (sidechain)', lib:str='madmom.BeatDetectionProcessor', log=True):
        """Generates beatmap if it isn't generated, applies fake sidechain on each beat to the song and writes the processed song it next to the .py file. If you don't want to write the file, set output=None
        
        output: can be a relative or an absolute path to a folder or to a file. Filename will be created from the original filename + a suffix to avoid overwriting. If path already contains a filename which ends with audio file extension, such as .mp3, that filename will be used.
        
        audio2: sidechain impulse, basically a curve that the volume will be multiplied by. By default one will be generated with generate_sidechain()
        
        scale: scales the beatmap, for example if generated beatmap is two times faster than the song you can slow it down by putting 0.5.
        
        shift: shifts the beatmap by this amount of unscaled beats
        
        start: position in seconds, beats before the position will not be manipulated
        
        end: position in seconds, same. Set to None by default.
        
        autotrim: trims silence in the beginning for better beat detection, True by default
        
        autoscale: scales beats so that they are between 10000 and 20000 samples long. Useful when you are processing a lot of files with similar BPMs, False by default.
        
        autoinsert: uses distance between beats and inserts beats at the beginning at that distance if possible. Set to False by default, sometimes it can fix shifted beatmaps and sometimes can add unwanted shift.
        
        filename2: loads sidechain impulse from the file if audio2 if not specified

        suffix: suffix that will be appended to the filename
        
        lib: beat detection library"""
        if log is False and self.log is True: 
            self.log = False
            log_disabled = True
        else: log_disabled = False
        self._printlog('___')
        scale = _safer_eval(scale)
        shift = _safer_eval(shift)
        if filename2 is None and audio2 is None:
            from . import generate
            audio2=generate.sidechain()

        if audio2 is None:
            audio2, samplerate2=open_audio(filename2)

        if self.bm is None: self.beatmap.generate(lib=lib)
        if autotrim is True: self.autotrim()
        save=self.beatmap.beatmap.copy()
        if autoscale is True: self.beatmap.autoscale()
        if shift!=0: self.beatmap.shift(shift)
        if scale!=1: self.beatmap.scale(scale)
        if autoinsert is True: self.beatmap.autoinsert()
        if start!=0 or end is not None: self.beatmap.cut(start, end)
        self.sidechain(audio2)

        if output is not None:
            if not (output.lower().endswith('.mp3') or output.lower().endswith('.wav') or output.lower().endswith('.flac') or output.lower().endswith('.ogg') or 
            output.lower().endswith('.aac') or output.lower().endswith('.ac3') or output.lower().endswith('.aiff')  or output.lower().endswith('.wma')):
                output=output+'.'.join(''.join(self.path.split('/')[-1]).split('.')[:-1])+suffix+'.mp3'
            self.write(output)
        
        self.beatmap.beatmap=save.copy()
        if log_disabled is True: self.log = True

    def quick_beatsample(self, output:str='', filename2:str=None, scale:float=1, shift:float=0, start:float=0, end:float=None, autotrim:bool=True, autoscale:bool=False, autoinsert:bool=False, audio2:numpy.array=None, suffix:str=' (BeatSample)', lib:str='madmom.BeatDetectionProcessor', log=True):
        """Generates beatmap if it isn't generated, adds chosen sample to each beat of the song and writes the processed song it next to the .py file. If you don't want to write the file, set output=None
        
        output: can be a relative or an absolute path to a folder or to a file. Filename will be created from the original filename + a suffix to avoid overwriting. If path already contains a filename which ends with audio file extension, such as .mp3, that filename will be used.
        
        filename2: path to the sample.
        
        scale: scales the beatmap, for example if generated beatmap is two times faster than the song you can slow it down by putting 0.5.
        
        shift: shifts the beatmap by this amount of unscaled beats
        
        start: position in seconds, beats before the position will not be manipulated
        
        end: position in seconds, same. Set to None by default.
        
        autotrim: trims silence in the beginning for better beat detection, True by default
        
        autoscale: scales beats so that they are between 10000 and 20000 samples long. Useful when you are processing a lot of files with similar BPMs, False by default.
        
        autoinsert: uses distance between beats and inserts beats at the beginning at that distance if possible. Set to False by default, sometimes it can fix shifted beatmaps and sometimes can add unwanted shift.
        
        suffix: suffix that will be appended to the filename
        
        lib: beat detection library"""
        if log is False and self.log is True: 
            self.log = False
            log_disabled = True
        else: log_disabled = False
        self._printlog('___')
        scale = _safer_eval(scale)
        shift = _safer_eval(shift)
        if filename2 is None and audio2 is None:
            from tkinter.filedialog import askopenfilename
            filename2 = askopenfilename(title='select sidechain impulse', filetypes=[("mp3", ".mp3"),("wav", ".wav"),("flac", ".flac"),("ogg", ".ogg"),("wma", ".wma")])

        if audio2 is None:
            audio2, samplerate2=open_audio(filename2)

        if self.bm is None: self.beatmap.generate(lib=lib)
        if autotrim is True: self.autotrim()
        save=self.beatmap.beatmap.copy()
        if autoscale is True: self.beatmap.autoscale()
        if shift!=0: self.beatmap.shift(shift)
        if scale!=1: self.beatmap.scale(scale)
        if autoinsert is True: self.beatmap.autoinsert()
        if start!=0 or end is not None: self.beatmap.cut(start, end)
        self.beatsample(audio2)

        if output is not None:
            if not (output.lower().endswith('.mp3') or output.lower().endswith('.wav') or output.lower().endswith('.flac') or output.lower().endswith('.ogg') or 
            output.lower().endswith('.aac') or output.lower().endswith('.ac3') or output.lower().endswith('.aiff')  or output.lower().endswith('.wma')):
                output=output+'.'.join(''.join(self.path.split('/')[-1]).split('.')[:-1])+suffix+'.mp3'
            self.write(output)
        self.beatmap.beatmap=save.copy()
        if log_disabled is True: self.log = True

    def spectogram_to_audio(self):
        self.audio = self.spectogram.toaudio()

    def beat_image_to_audio(self):
        self.audio = self.beat_image.toaudio()


def fix_beatmap(filename, lib='madmom.BeatDetectionProcessor', scale=1, shift=0):
    if scale==1 and shift==0:
        print('scale = 1, shift = 0: no changes have been made.')
        return
    track=song(filename)
    audio_id=hex(len(track.audio[0]))
    cacheDir="SavedBeatmaps/" + ''.join(track.filename.split('/')[-1]) + "_"+lib+"_"+audio_id+'.txt'
    import os
    if not os.path.exists(cacheDir):
        print(f"beatmap isn't generated: {filename}")
        return
    track.beatmap.generate(lib=lib)
    track.beatmap.shift(shift)
    track.beatmap.scale(scale)
    if not os.path.exists('SavedBeatmaps'):
        os.mkdir('SavedBeatmaps')
    a=input(f'Are you sure you want to overwrite {cacheDir} using scale = {scale}; shift = {shift}? ("y" to continue): ')
    if 'n' in a.lower() or not 'y' in a.lower():
        print('Operation canceled.') 
        return
    else: 
        track.beatmap._toarray()
        numpy.savetxt(cacheDir, track.bm.astype(int), fmt='%d')
        print('Beatmap overwritten.')

def delete_beatmap(filename, lib='madmom.BeatDetectionProcessor'):
    track=song(filename)
    audio_id=hex(len(track.audio[0]))
    import os
    if not os.path.exists('SavedBeatmaps'):
        os.mkdir('SavedBeatmaps')
    cacheDir="SavedBeatmaps/" + ''.join(track.filename.split('/')[-1]) + "_"+lib+"_"+audio_id+'.txt'
    if not os.path.exists(cacheDir):
        print(f"beatmap doesn't exist: {filename}")
        return
    a=input(f'Are you sure you want to delete {cacheDir}? ("y" to continue): ')
    if 'n' in a.lower() or not 'y' in a.lower():
        print('Operation canceled.') 
        return
    else: 
        os.remove(cacheDir)
        print('Beatmap deleted.')


def _tosong(audio, bmap, samplerate, log):
    from .wrapper import _song_copy
    if isinstance(audio, str) or audio is None: audio = song(audio, bmap=bmap, log = log)
    elif isinstance(audio, list) or isinstance(audio, numpy.ndarray) or isinstance(audio, tuple):
        assert samplerate is not None, "If audio is an array, samplerate must be provided"
        if len(audio)>16 and isinstance(audio[0], list) or isinstance(audio[0], numpy.ndarray) or isinstance(audio[0], tuple):
            audio = numpy.asarray(audio).T
        audio = song(audio=audio, samplerate=samplerate, bmap=bmap, log = log)
    elif isinstance(audio, song): 
        audio = _song_copy(audio)
        audio.log, audio.beatmap.log, audio.beat_image.log = log, log, log
    else: assert False, f"Audio should be either a path to a file, a list/array/tuple, a beat_manipulator.song object, or None for a pick file dialogue, but it is {type(audio)}"
    return audio

def beatswap(pattern: str, audio = None, scale: float = 1, shift: float = 0, output='', samplerate = None, bmap = None, log = True, suffix=' (beatswap)'):
    audio = _tosong(audio=audio, bmap=bmap, samplerate=samplerate, log=log)
    output = _outputfilename(output=output, filename=audio.path, suffix=suffix)
    audio.quick_beatswap(pattern = pattern, scale=scale, shift=shift, output=output)

def generate_beat_image(audio = None, output='', samplerate = None, bmap = None, log = True, ext='png', maximum=4096):
    audio = _tosong(audio=audio, bmap=bmap, samplerate=samplerate, log=log)
    output = _outputfilename(output=output, filename=audio.path, ext=ext, suffix = '')
    audio.beatmap.generate()
    audio.beat_image.generate()
    audio.beat_image.write(output=output, maximum = maximum)
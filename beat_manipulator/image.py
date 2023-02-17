import numpy

class image:
    def __init__(self, image=None, audio=None, samplerate=None, beatmap=None, log=None):
        self.image=image
        self.audio = audio
        self.samplerate=samplerate
        self.beatmap=beatmap
        self.log=log

    def __getitem__(self, var):
        return self.beatmap[var]

    def _printlog(self, string, end=None, force = False, forcei = False):
        if (self.log is True or force is True) and forcei is False:
            if end is None: print(string)
            else:print(string,end=end)

    def _toshape(self):
        if self.image.ndim == 2: 
            self.image = [self.image]
        if self.image.ndim == 3:
            if len(self.image[0][0]) == 3:
                self.image = [self.image]

    def _channel(self):
        if self.image.ndim == 2: yield self.image
        if self.image.ndim == 3:
            if len(self.image[0][0]) == 3:
                yield self.image
        if self.image.ndim > 3 or len(self.image[0][0] != 3):
            for i in self.image:
                yield i

    @property
    def combined(self):
        for i, channel in enumerate(self._channel()):
            if i==0: combined = channel.copy()
            else: combined += channel
        return combined

    def open(self, path):
        import cv2
        self.image = cv2.imread(path)
    
    def display(self):
        import cv2
        cv2.imshow('image', self.combined)

    def write(self, output, rotate = True, mode = 'square', maximum = 4096):
        import cv2
        mode = mode.lower()
        image = self.combined
        if mode=='square':
            y=min(len(image), len(image[0]), maximum)
            y=max(y, maximum)
            image = cv2.resize(image, (y,y), interpolation=cv2.INTER_NEAREST)
        elif mode=='tosmallest':
            y=min(len(image), len(image[0]))
            image = cv2.resize(image, (x,x), interpolation=cv2.INTER_NEAREST)
        elif mode=='maximum':
            x = min(len(image), maximum)
            y = min(len(image[0]), maximum)
            image = cv2.resize(image, (x,y), interpolation=cv2.INTER_NEAREST)
        if rotate is True: image=image.T
        cv2.imwrite(output, image)


    def effect_blur(self, value=(5,5)):
        """similar to echo"""
        import cv2
        if isinstance(value, int) or isinstance(value, float): value = (value, value)
        for i in range(len(self.image)):
            self.image[i]=cv2.blur(self.image[i], value)

    def effect_median(self, value=5):
        """similar to echo"""
        import scipy.signal
        for i in range(len(self.image)):
            self.image[i]=scipy.signal.medfilt2d(self.image[i], value)

    def effect_uniform(self, value=5):
        """similar to echo"""
        import scipy.ndimage
        for i in range(len(self.image)):
            self.image[i]= scipy.ndimage.uniform_filter(self.image[i], value)

    def effect_shift2d(self, value=5):
        """very weird effect, mostly produces silence"""
        import scipy.ndimage
        self.image= scipy.ndimage.fourier_gaussian(self.image, value)
        self.image=self.image*(255/numpy.max(self.image))

    def effect_spline(self, value=3):
        """barely noticeable echo"""
        import scipy.ndimage
        for i in range(len(self.image)):
            self.image[i]= scipy.ndimage.spline_filter(self.image[i], value)

    def effect_rotate(self, value=0.1):
        """rotates self.image in degrees"""
        import scipy.ndimage
        image = [0 for _ in range(len(self.image))]
        for i in range(len(image)):
            image[i] = scipy.ndimage.rotate(self.image[i], value)
        self.image = numpy.asarray(image)

    def effect_gradient(self):
        self.image=numpy.asarray(numpy.gradient(self.image)[0])

class spectogram(image):
    def generate(self, hop_length:int = 512):
        self.hop_length=hop_length
        import librosa
        self.image=librosa.feature.melspectrogram(y=self.audio, sr=self.samplerate, hop_length=hop_length)
        self.mask = numpy.full(self.image.shape, True)
        self._toshape()

    def toaudio(self):
        import librosa
        self.audio=librosa.feature.inverse.mel_to_audio(M=numpy.swapaxes(numpy.swapaxes(numpy.dstack(( self.image[0,:,:],  self.image[1,:,:])), 0, 2), 1,2), sr=self.samplerate, hop_length=self.hop_length)
        return self.audio
    

class beat_image(image):
    def generate(self, mode='median'):
        """Turns song into an image based on beat positions."""
        assert self.beatmap is not None, 'Please run song.beatmap.generate() first. beat_image.generate needs beatmap to work.'
        self._printlog('generating beat-image; ')
        mode=mode.lower()
        if isinstance(self.audio,numpy.ndarray): self.audio=numpy.ndarray.tolist(self.audio)
        # add the bits before first beat
        self.image=([self.audio[0][0:self.beatmap[0]],], [self.audio[1][0:self.beatmap[0]],])
        # maximum is needed to make the array homogeneous
        maximum=self.beatmap[0]
        values=[]
        values.append(self.beatmap[0])
        for i in range(len(self.beatmap)-1):
            self.image[0].append(self.audio[0][self.beatmap[i]:self.beatmap[i+1]])
            self.image[1].append(self.audio[1][self.beatmap[i]:self.beatmap[i+1]])
            maximum = max(self.beatmap[i+1]-self.beatmap[i], maximum)
            values.append(self.beatmap[i+1]-self.beatmap[i])
        if 'max' in mode: norm=maximum
        elif 'med' in mode: norm=numpy.median(values)
        elif 'av' in mode: norm=numpy.average(values)
        for i in range(len(self.image[0])):
            beat_diff=int(norm-len(self.image[0][i]))
            if beat_diff>0:
                self.image[0][i].extend([numpy.nan]*beat_diff)
                self.image[1][i].extend([numpy.nan]*beat_diff)
            elif beat_diff<0:
                self.image[0][i]=self.image[0][i][:beat_diff]
                self.image[1][i]=self.image[1][i][:beat_diff]
        self.image=numpy.asarray(self.image)*255
        self.mask = self.image == numpy.nan
        self.image=numpy.nan_to_num(self.image)
        self._toshape()

    def toaudio(self):
        self._printlog('converting beat-image to audio; ')
        image=numpy.asarray(self.image)/255
        try: image[self.mask]=numpy.nan
        except IndexError: pass
        audio=list([] for _ in range(len(image)))
        #print(audio)
        #print(len(image), len(image[0]), len(image[1]), len(image[0][0]), len(image[1][0]), len(image[0][1]), len(image[1][1]))
        for j in range(len(image)):
            for i in range(len(image[j])):
                beat=image[j][i]
                #print(i,j, len(image[0][j]), len(image[1][j]), len(beat), end='     ')
                beat=beat[~numpy.isnan(beat)]
                #print(len(beat), end='     ')
                audio[j].extend(beat)
                #print(len(audio[0]), len(audio[1]))
        self.audio=numpy.asarray(audio)
        return self.audio
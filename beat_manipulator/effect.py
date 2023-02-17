import numpy

def normalize(audio):
    audio=audio-(numpy.min(audio)+numpy.max(audio))/2
    return audio*(1-(max(numpy.max(audio), abs(numpy.min(audio)))))

def pitch(audio, pitch, grain):
    grain=int(grain)
    if len(audio)>10: audio=[audio]
    if type(audio) is not list: audio=audio.tolist()
    length=len(audio[0])
    if pitch<1:
        pitch=int(1//pitch)
        if grain%2!=0: grain+=1
        for i in range(len(audio)):
            n=0
            while n+grain<length:
                #print(len(audio[i]))
                #print(n)
                audio[i][n:n+grain]=numpy.repeat(audio[i][n:n+int(grain/2)], 2)
                #print(len(audio[i]))
                n+=grain
    elif pitch>1:
        pitch=int(pitch)
        for i in range(len(audio)):
            n=0
            while n+grain<length:
                audio[i][n:n+grain]=audio[i][n:n+grain:pitch]*pitch
                n+=grain
    return audio

def pitchB(audio, pitch, grain):
    grain=int(grain)
    if len(audio)>10: audio=[audio]
    if type(audio) is not list: audio=audio.tolist()
    length=len(audio[0])
    if pitch<1:
        pitch=int(1//pitch)
        if grain%2!=0: grain+=1
        for i in range(len(audio)):
            n=0
            while n+grain<length:
                #print(len(audio[i]))
                #print(n)
                audio[i][n:n+grain]=numpy.repeat(audio[i][n:n+int(grain/2)], 2)
                #print(len(audio[i]))
                n+=grain

    elif pitch>1:
        pitch=int(pitch)
        for i in range(len(audio)):
            n=0
            while n+grain<length:
                audio2=audio[i][n:n+grain:pitch]
                for j in range(pitch-1):
                    #print(j)
                    audio2.extend(audio2[::1] if j%2==1 else audio2[::-1])
                audio[i][n:n+grain]=audio2
                n+=grain
    return audio

def grain(audio, grain):
    grain=int(grain)
    if len(audio)>10: audio=[audio]
    if type(audio) is not list: audio=audio.tolist()
    length=len(audio[0])
    n=0
    for i in range(len(audio)):
        while n+2*grain<length:
            audio[i][n+grain:n+2*grain]=audio[i][n:n+grain]
            n+=grain*2
    return audio

def ftt(audio, inverse=True):
    """headphone warning: cursed effect"""
    import scipy.fft
    audio=numpy.asarray(audio).copy()
    for i in range(len(audio)):
        if inverse is False:
            audio[i]= scipy.fft.fft(audio[i], axis=0)
        else: 
            audio[i]= scipy.fft.ifft(audio[i], axis=0)
    audio=(audio*(2/numpy.max(audio)))-1
    return normalize(audio)
    
def fourier_shift(audio, value=5):
    """modulates volume for some reason"""
    import scipy.ndimage
    audio=numpy.asarray(audio).copy()
    audio= numpy.asarray(list(scipy.ndimage.fourier_shift(i, value, axis=-1) for i in audio)).astype(float)
    return normalize(audio)

def gradient(audio):
    """acts as an interesting high pass filter that removes drums"""
    audio=numpy.asarray(audio).copy()
    return numpy.gradient(audio, axis=0)

def gradient_inverse(audio):
    """supposed to be inverse of a gradient, but it just completely destroys the audio into a distorted mess"""
    audio=numpy.asarray(audio).copy()
    for i in range(len(audio)):
        a = audio[i]
        audio[i] = a[0] + 2 * numpy.c_[numpy.r_[0, a[1:-1:2].cumsum()], a[::2].cumsum() - a[0] / 2].ravel()[:len(a)]
    audio=normalize(audio)
    return numpy.gradient(audio, axis=0)


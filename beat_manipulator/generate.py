import numpy
def sidechain(samplerate:int = 44100, 
                       length: float = 0.5, 
                       curve: float = 2, 
                       vol0: float = 0, 
                       vol1: float = 1, 
                       smoothing: int = 40,
                       channels:int = 2) -> tuple:
    
    x = numpy.linspace(vol0,vol1,int(length*samplerate))**curve
    if smoothing is not None:
        x = numpy.concatenate(numpy.linspace(1,0,smoothing),x)
    return tuple(x for _ in range(channels)) if channels>1 else x
    
def sine(len, freq, samplerate, volume=1):
    return numpy.sin(numpy.linspace(0, freq*3.1415926*2*len, int(len*samplerate)))*volume

def saw(len, freq, samplerate, volume=1):
    return (numpy.linspace(0, freq*2*len, int(len*samplerate))%2 - 1)*volume

def square(len, freq, samplerate, volume=1):
    return ((numpy.linspace(0, freq*2*len, int(len*samplerate)))//1%2 * 2 - 1)*volume
import numpy
#@njit SLOWER
def detect_bpm(audio, samplerate, bpm_low=40, bpm_high=300, bpm_step=0.1, mode=1, shift_step=10):
    """A very slow and inefficient algorithm!"""
    audio = numpy.asarray(audio)
    audio = (audio[0] + audio[1]).astype(numpy.float32)
    length=len(audio)
    mlength=length- int( 1 / ((bpm_low / 60) / samplerate) )  # to make sure those parts do not affect the calculation as they will be cut sometimes
    #audio[:int(spb_low)]=0 # to make sure those parts do not affect the calculation as they will be cut sometimes
    bpmdiffs=[]
    bpmdiffsi=[]
    minimum=100000000
    for i in range(int((bpm_high-bpm_low)/bpm_step)):
        spb=int(round(1/(((bpm_low + i*bpm_step) / 60) / samplerate)))
        # audio is reshaped into a 2d array with bpm
        end=-int(length % spb)
        if end == 0: end = length
        image = audio[:end].reshape(-1, spb)
        if mode == 1: image=image.T
        # diff21, diff22, diff41, diff42 = image[:-2].flatten(), image[2:].flatten(), image[:-4].flatten(), image[4:].flatten()
        # difference=abs( numpy.dot(diff21, diff22)/(numpy.linalg.norm(diff21)*numpy.linalg.norm(diff22)) + numpy.dot(diff41, diff42)/(numpy.linalg.norm(diff41)*numpy.linalg.norm(diff42)) )
        diff2=numpy.abs ( (image[:-2] - image[2:]).flatten()[:mlength] )
        diff4=numpy.abs ( (image[:-4] - image[4:]).flatten()[:mlength] )
        difference=numpy.sum(diff2*diff2*diff2*diff2) + numpy.sum(diff4*diff4*diff4*diff4)
        # for i in range(len(image)-1):
        #     difference.append(numpy.sum(image[i]-image[i]+1))
        if mode == 3: 
            image=image.T
            diff2=numpy.abs ( (image[:-2] - image[2:]).flatten()[:mlength] )
            diff4=numpy.abs ( (image[:-4] - image[4:]).flatten()[:mlength] )
            difference=numpy.sum(diff2*diff2*diff2*diff2) + numpy.sum(diff4*diff4*diff4*diff4)
        bpmdiffs.append(spb)
        bpmdiffsi.append(difference)
        if difference<minimum: 
            #print(f'{spb}: testing BPM = {(1/spb)*60*samplerate}; value = {difference}')
            print(i)
            minimum=difference
    spb = bpmdiffs[numpy.argmin(numpy.asarray(bpmdiffsi))]
    #print(f'BPM = {(1/spb)*60*samplerate}')
    bpmdiffs=[]
    bpmdiffsi=[]
    #audio[int(spb):]=0
    print(spb)
    for shift in range(0, spb, shift_step):
        #print(shift)
        end=-int(length % spb)
        if end == 0: end = length+shift
        image = audio[shift:end].reshape(-1, spb)
        length-=shift_step
        if mode == 1: image=image.T
        diff =  numpy.abs ( (image[:-1] - image[1:]).flatten()[:mlength] )
        difference=numpy.sum(diff*diff)
        if mode == 3: 
            image=image.T
            diff =  numpy.abs ( (image[:-1] - image[1:]).flatten()[:mlength] )
            difference += numpy.sum(diff*diff)
        bpmdiffs.append(shift)
        bpmdiffsi.append(difference)
        #if shift%1000==0: print(f'testing shift = {shift}; value = {difference}')
    shift = bpmdiffs[numpy.argmin(numpy.asarray(bpmdiffsi))]
    #print(f'BPM = {(1/spb)*60*samplerate}; shift = {shift/samplerate} sec.')
    return numpy.arange(shift, length, spb)
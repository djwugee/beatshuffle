import numpy
from . import main as bm
def mix_shuffle_approx_random(audio1, audio2, iterations, minlength=0, maxlength=None, bias=0):
    import random
    if isinstance(audio1, bm.song): 
        minlength*=audio1.samplerate
        if maxlength is not None: maxlength*=audio1.samplerate
        audio1=audio1.audio
    else:
        minlength*=44100
        if maxlength is not None: maxlength*=44100
    if isinstance(audio2, bm.song): audio2=audio2.audio
    if len(audio1)>16: audio1=numpy.asarray([audio1,audio1])
    if len(audio2)>16: audio1=numpy.asarray([audio2,audio2])
    shape2=len(audio2)
    mono1=numpy.abs(numpy.gradient(audio1[0]))
    mono2=numpy.abs(numpy.gradient(audio2[0]))
    length1=len(mono1)
    length2=len(mono2)
    result=numpy.zeros(shape=(shape2, length2))
    result_diff=numpy.zeros(shape=length2)
    old_difference=numpy.sum(mono2)
    random_result=result_diff.copy()
    for i in range(iterations):
        rstart=random.randint(0, length1)
        if maxlength is not None:
            rlength=random.randint(minlength, min(length1-rstart, maxlength))
        else: rlength=random.randint(minlength, minlength+length1-rstart)
        rplace=random.randint(0, length2-rlength)
        random_result=numpy.array(result_diff, copy=True)
        random_result[rplace:rplace + rlength] = mono1[rstart:rstart + rlength]
        difference = numpy.sum(numpy.abs(mono2 - random_result))
        if difference<old_difference-bias:
            print(i, difference)
            result[:, rplace:rplace + rlength] = audio1[:, rstart:rstart + rlength]
            result_diff=random_result
            old_difference = difference
    return result
# 10 5 4 1
# 10 0 0 0
# 0  5 4 1 10
# 10 5 4 1
# 10 5 4 1


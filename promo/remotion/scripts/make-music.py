import math, random, struct, wave

SR = 48000
DUR = 62.0
N = int(SR * DUR)
random.seed(19)

# Repeating four-chord ambient progression: Am9 / Fmaj7 / Cmaj9 / G6.
progression = [
    [110.00, 164.81, 220.00, 261.63, 329.63, 493.88],
    [87.31, 130.81, 174.61, 220.00, 261.63, 329.63],
    [130.81, 164.81, 196.00, 261.63, 293.66, 392.00],
    [98.00, 146.83, 196.00, 246.94, 293.66, 392.00],
]
motifs = [659.25, 523.25, 659.25, 587.33, 783.99, 659.25, 987.77, 783.99]

left = [0.0] * N
right = [0.0] * N

# Pads, re-entering every 8 seconds.
for start in range(0, int(DUR), 8):
    for ci in range(4):
        seg_start = start + ci * 2.0
        if seg_start >= DUR: break
        length = min(2.0, DUR - seg_start)
        for i in range(int(seg_start * SR), min(N, int((seg_start + length) * SR))):
            t = i / SR
            local = t - seg_start
            env = max(0.0, min(1.0, local / 0.9) * min(1.0, (length - local) / 1.0))
            lfo = 0.5 + 0.5 * math.sin(2 * math.pi * 0.045 * t + start * 0.3)
            l = r = 0.0
            for j, f in enumerate(progression[ci]):
                phase = 0.2 * j + start * 0.1
                tone = math.sin(2 * math.pi * f * t + phase) + 0.18 * math.sin(2 * math.pi * f * 2 * t + phase)
                pan = 0.30 + 0.13 * j
                l += tone * (1 - pan); r += tone * pan
            left[i] += env * l * 0.025 * (0.8 + 0.2 * lfo)
            right[i] += env * r * 0.025 * (0.8 + 0.2 * lfo)

# Slow sub pulse.
for beat in [x * 2.0 for x in range(30)]:
    for i in range(int(beat * SR), min(N, int((beat + 0.55) * SR))):
        t = i / SR - beat
        env = min(1.0, t / 0.015) * math.exp(-t / 0.28)
        v = math.sin(2 * math.pi * 55.0 * t) * env * 0.10
        left[i] += v; right[i] += v

# Plucked motif every two bars.
for start in range(2, 62, 4):
    for k in range(3):
        when = start + k * 1.15
        if when >= DUR: break
        freq = motifs[(start // 4 * 3 + k) % len(motifs)]
        for i in range(int(when * SR), min(N, int((when + 1.9) * SR))):
            t = i / SR - when
            env = min(1.0, t / 0.01) * math.exp(-t / 0.65)
            v = (math.sin(2 * math.pi * freq * t) + 0.16 * math.sin(2 * math.pi * freq * 2.01 * t)) * env * 0.055
            left[i] += v * 0.75; right[i] += v

# Air.
state_l = state_r = 0.0
for i in range(N):
    state_l = state_l * 0.985 + random.uniform(-1, 1) * 0.015
    state_r = state_r * 0.985 + random.uniform(-1, 1) * 0.015
    fade = min(1.0, i / (SR * 1.5), (N - i) / (SR * 3.0))
    left[i] += state_l * 0.007 * fade
    right[i] += state_r * 0.007 * fade

fade_in = int(SR * 1.5); fade_out = int(SR * 3.0)
peak = max(1e-9, max(max(abs(v) for v in left), max(abs(v) for v in right)))
gain = 0.82 / peak
for i in range(N):
    fade = min(1.0, i / fade_in, (N - i) / fade_out)
    left[i] *= gain * fade; right[i] *= gain * fade

with wave.open('project/public/audio/music-full.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    data = bytearray()
    for l, r in zip(left, right):
        data += struct.pack('<hh', int(max(-1, min(1, l)) * 32767), int(max(-1, min(1, r)) * 32767))
    w.writeframes(data)
print('written', len(data))

#!/usr/bin/env python3
"""
Trilha do vídeo da Plataforma Córtex, sintetizada aqui mesmo (sem amostras de terceiros).

Ré maior, 72 batidas por minuto, compasso de 3,333 s. Pad suave, piano de feltro em arpejo,
baixo longo e uma linha alta descendente. Sem bateria e sem efeitos de transição.
Os compassos acompanham as cenas: o compasso 19 abre o fluxo (63,3 s) e o 21 cai na
assinatura (70,0 s), onde o acorde final soa até o fim.

Uso: python3 scripts/trilha.py [saida.wav]   (padrão: video/trilha.wav)
Só precisa de numpy.
"""
import sys
import wave

import numpy as np

TAXA = 48000
DURACAO = 75.4
COMPASSO = 70.0 / 21  # 21 compassos até a assinatura
N = int(DURACAO * TAXA)
rng = np.random.default_rng(11)

esq = np.zeros(N)
dir_ = np.zeros(N)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def somar(sinal, inicio, pan=0.0, ganho=1.0):
    """Mistura um sinal mono a partir de `inicio` segundos, com pan de -1 (esq.) a 1 (dir.)."""
    i = int(inicio * TAXA)
    if i < 0:
        sinal, i = sinal[-i:], 0
    if i >= N:
        return
    s = sinal[: N - i] * ganho
    esq[i : i + len(s)] += s * np.sqrt((1 - pan) / 2)
    dir_[i : i + len(s)] += s * np.sqrt((1 + pan) / 2)


# acordes: pad, arpejo do piano, baixo, nota alta
D = dict(pad=[50, 57, 61, 64, 66], arp=[66, 69, 73, 76], baixo=38, alta=78)
Bm = dict(pad=[50, 54, 57, 62, 64], arp=[66, 69, 71, 74], baixo=35, alta=76)
G = dict(pad=[50, 54, 57, 59, 62], arp=[66, 67, 71, 74], baixo=43, alta=74)
A = dict(pad=[52, 57, 61, 64, 69], arp=[64, 69, 71, 76], baixo=45, alta=73)
CICLO = [D, Bm, G, A]
COMPASSOS = [CICLO[b % 4] for b in range(19)] + [G, A, D]


def pad(midi, dur, nivel):
    """Duas vozes levemente desafinadas, poucos harmônicos, ataque e saída lentos."""
    t = np.arange(int((dur + 1.6) * TAXA)) / TAXA
    s = np.zeros_like(t)
    for desvio in (-0.06, 0.06):
        f = hz(midi + desvio)
        for n in range(1, 7):
            s += np.sin(2 * np.pi * n * f * t + rng.uniform(0, 6.28)) / n**1.8
    ataque = np.clip(t / 1.1, 0, 1) ** 2
    saida = np.clip((dur + 1.6 - t) / 1.6, 0, 1)
    respira = 1 + 0.06 * np.sin(2 * np.pi * 0.11 * t)
    return s * ataque * saida * respira * nivel


def piano(midi, vel, dur=4.0):
    """Piano de feltro: harmônicos que caem mais rápido quanto mais agudos."""
    t = np.arange(int(dur * TAXA)) / TAXA
    f = hz(midi)
    s = np.zeros_like(t)
    for k, a in enumerate([1, 0.42, 0.2, 0.09, 0.05, 0.025], start=1):
        tau = 2.4 / k**0.7
        s += a * np.sin(2 * np.pi * k * f * (1 + 0.0004 * k * k) * t) * np.exp(-t / tau)
    ataque = np.clip(t / 0.006, 0, 1)
    fim = np.clip((dur - t) / 0.4, 0, 1)
    return s * ataque * fim * vel


def seno_longo(midi, dur, nivel, ataque=0.4, vibrato=0.0):
    t = np.arange(int((dur + 1.2) * TAXA)) / TAXA
    fase = 2 * np.pi * hz(midi) * t + vibrato * np.sin(2 * np.pi * 4.6 * t)
    s = np.sin(fase) + 0.18 * np.sin(2 * fase)
    env = np.clip(t / ataque, 0, 1) * np.clip((dur + 1.2 - t) / 1.2, 0, 1)
    return s * env * nivel


# padrões do arpejo em colcheias (posição, índice da nota)
PADROES = [
    [(0, 0), (3, 2), (4, 1), (6, 3)],
    [(0, 1), (2, 3), (4, 2), (7, 0)],
]
COLCHEIA = COMPASSO / 8

for b, ac in enumerate(COMPASSOS):
    ini = b * COMPASSO
    final = b == 21
    dur = (DURACAO - ini) if final else COMPASSO
    elevar = 1.12 if b in (19, 20) else 1.0

    # pad desde o início, entrando devagar
    nivel_pad = 0.05 * (0.55 if b < 2 else 1.0) * elevar
    for j, m in enumerate(ac["pad"]):
        somar(pad(m, dur, nivel_pad), ini - 0.05, pan=(j - 2) * 0.28)
    if b >= 19:  # o fluxo e a assinatura ganham a oitava de cima
        for j, m in enumerate(ac["pad"][2:]):
            somar(pad(m + 12, dur, nivel_pad * 0.45), ini, pan=0.5 - j * 0.5)

    # baixo a partir do compasso 4
    if b >= 4:
        somar(seno_longo(ac["baixo"], dur, 0.16 * elevar, ataque=0.25), ini)

    # piano a partir do compasso 2; na assinatura, um acorde arpejado e nada mais
    if final:
        for j, m in enumerate([62, 66, 69, 73, 76]):
            somar(piano(m, 0.16 - j * 0.012, dur=5.0), ini + j * 0.07, pan=-0.3 + j * 0.15)
    elif b >= 2:
        vel_base = 0.1 if b < 4 else 0.13
        for pos, idx in PADROES[b % 2]:
            nota = ac["arp"][idx]
            vel = vel_base * (1.0 if pos == 0 else 0.78) * elevar * rng.uniform(0.9, 1.05)
            somar(piano(nota, vel), ini + pos * COLCHEIA + rng.uniform(0, 0.012), pan=(idx - 1.5) * 0.25)
        if b in (19, 20):  # mais duas notas no fluxo
            for pos, idx in [(5, 0), (7, 2)]:
                somar(piano(ac["arp"][idx] + 12, 0.06), ini + pos * COLCHEIA, pan=0.3)

    # linha alta, longa e baixa, do compasso 8 ao 18
    if 8 <= b <= 18:
        somar(seno_longo(ac["alta"], COMPASSO * 0.9, 0.022, ataque=0.9, vibrato=0.002), ini + 0.1, pan=0.15)

# corta o grave abaixo de 35 Hz e o agudo acima de ~5 kHz, no domínio da frequência
def filtrar(x):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / TAXA)
    ganho = 1 / np.sqrt(1 + (f / 5200) ** 4)
    ganho *= 1 / np.sqrt(1 + (35 / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X * ganho, len(x))


esq, dir_ = filtrar(esq), filtrar(dir_)

# reverberação: ruído com queda exponencial (RT60 ~ 2,8 s), diferente em cada canal
def resposta():
    t = np.arange(int(3.2 * TAXA)) / TAXA
    r = rng.standard_normal(len(t)) * np.exp(-6.9 * t / 2.8)
    r[: int(0.022 * TAXA)] = 0
    R = np.fft.rfft(r)
    f = np.fft.rfftfreq(len(r), 1 / TAXA)
    r = np.fft.irfft(R / np.sqrt(1 + (f / 3500) ** 2), len(r))
    return r / np.sqrt(np.sum(r**2))


def convolver(x, r):
    n = 1 << int(np.ceil(np.log2(len(x) + len(r))))
    return np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(r, n), n)[: len(x)]


re, rd = resposta(), resposta()
molhado_e, molhado_d = convolver(esq, re), convolver(dir_, rd)
esq = esq * 0.72 + molhado_e * 0.55
dir_ = dir_ * 0.72 + molhado_d * 0.55

# entrada, saída e nível
t = np.arange(N) / TAXA
env = np.clip(t / 1.8, 0, 1) * np.clip((DURACAO - t) / 3.2, 0, 1)
estereo = np.stack([esq, dir_], axis=1) * env[:, None]
rms = np.sqrt(np.mean(estereo[int(8 * TAXA) : int(63 * TAXA)] ** 2))
estereo *= 10 ** (-18 / 20) / rms  # cerca de -16 LUFS no corpo da música
estereo = np.tanh(estereo * 1.1) / 1.1  # segura picos sem bombear
pico = np.max(np.abs(estereo))
if pico > 10 ** (-1.5 / 20):
    estereo *= 10 ** (-1.5 / 20) / pico

saida = sys.argv[1] if len(sys.argv) > 1 else "video/trilha.wav"
with wave.open(saida, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(TAXA)
    w.writeframes((estereo * 32767).astype("<i2").tobytes())
print(f"trilha: {saida} ({DURACAO} s, pico {20 * np.log10(np.max(np.abs(estereo))):.1f} dBFS)")

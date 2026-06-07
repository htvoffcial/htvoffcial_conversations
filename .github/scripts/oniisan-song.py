#!/usr/bin/env python3
import argparse
import math
import sys
import wave
from array import array

SAMPLE_RATE = 44100
MAX_INPUT_CHARS = 200
MAX_SECONDS = 30.0
MIN_BPM = 60
MAX_BPM = 120
DEFAULT_TEXT = "おにいさん"

DURATION_BY_CHAR_TYPE = {
    "hiragana": 0.25,
    "katakana": 0.30,
    "kanji": 0.50,
    "alpha": 0.15,
    "digit": 0.20,
    "other": 0.25,
}

CHORD_PATTERNS = {
    "A_pop": ("I", "V", "vi"),
    "B_citypop": ("IV", "V", "iii"),
    "C_game": ("vi", "IV", "V"),
    "D_lofi": ("ii", "V", "I"),
    "E_drama": ("iii", "vi", "IV"),
    "F_ambient": ("I", "iii", "ii"),
}

TRIADS_C_MAJOR = {
    "I": (60, 64, 67),
    "ii": (62, 65, 69),
    "iii": (64, 67, 71),
    "IV": (65, 69, 72),
    "V": (67, 71, 74),
    "vi": (69, 72, 76),
}

SEMITONE_TO_C_MAJOR = (0, 0, 2, 2, 4, 5, 5, 7, 7, 9, 9, 11)


def midi_to_freq(midi_note: int) -> float:
    return 440.0 * (2.0 ** ((midi_note - 69) / 12.0))


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def detect_char_type(ch: str) -> str:
    cp = ord(ch)
    if 0x3040 <= cp <= 0x309F:
        return "hiragana"
    if 0x30A0 <= cp <= 0x30FF:
        return "katakana"
    if (0x3400 <= cp <= 0x4DBF) or (0x4E00 <= cp <= 0x9FFF):
        return "kanji"
    if ch.isascii() and ch.isalpha():
        return "alpha"
    if ch.isdigit():
        return "digit"
    return "other"


def char_to_melody_freq(ch: str) -> float:
    cp = ord(ch)
    semitone = SEMITONE_TO_C_MAJOR[cp % 12]
    octave = (cp // 12) % 3
    midi = 60 + semitone + octave * 12
    return midi_to_freq(midi)


def apply_adsr(position_sec: float, duration_sec: float) -> float:
    attack = min(0.02, duration_sec * 0.2)
    decay = min(0.06, duration_sec * 0.2)
    release = min(0.08, duration_sec * 0.25)
    sustain = max(0.0, duration_sec - attack - decay - release)

    if position_sec <= attack and attack > 0:
        return position_sec / attack
    if position_sec <= attack + decay and decay > 0:
        rel = (position_sec - attack) / decay
        return 1.0 - rel * 0.25
    if position_sec <= attack + decay + sustain:
        return 0.75
    release_pos = position_sec - attack - decay - sustain
    if release > 0 and release_pos <= release:
        return 0.75 * (1.0 - (release_pos / release))
    return 0.0


def add_note(track: array, start_sec: float, duration_sec: float, freq: float, gain: float) -> None:
    if duration_sec <= 0:
        return
    total_samples = len(track)
    start_idx = int(start_sec * SAMPLE_RATE)
    sample_len = int(duration_sec * SAMPLE_RATE)
    if start_idx >= total_samples:
        return
    end_idx = min(start_idx + sample_len, total_samples)
    phase_step = (2.0 * math.pi * freq) / SAMPLE_RATE

    for idx in range(start_idx, end_idx):
        local_sample = idx - start_idx
        t = local_sample / SAMPLE_RATE
        env = apply_adsr(t, duration_sec)
        track[idx] += gain * env * math.sin(phase_step * local_sample)


def build_melody_events(text: str):
    events = []
    cursor = 0.0
    for ch in text:
        duration = DURATION_BY_CHAR_TYPE[detect_char_type(ch)]
        events.append((cursor, duration, char_to_melody_freq(ch)))
        cursor += duration
        if cursor >= MAX_SECONDS:
            break
    return events, cursor


def write_wav(path: str, samples: array) -> None:
    peak = max((abs(v) for v in samples), default=0.0)
    if peak > 0:
        scale = 0.95 / peak
        for i in range(len(samples)):
            samples[i] *= scale

    pcm = array("h")
    for value in samples:
        clipped = int(clamp(value, -1.0, 1.0) * 32767)
        pcm.append(clipped)

    with wave.open(path, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        wav_file.writeframes(pcm.tobytes())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate oniisan music WAV from text")
    parser.add_argument("--text", default="", help="Input text")
    parser.add_argument("--input-text-file", default="", help="Path to input text file")
    parser.add_argument("--output", default="genoniisan_output.wav", help="Output WAV path")
    parser.add_argument("--bpm", type=int, default=96, help="BPM (60-120)")
    parser.add_argument("--progression", default="A_pop", choices=tuple(CHORD_PATTERNS.keys()))
    return parser.parse_args()


def load_text(args: argparse.Namespace) -> str:
    text = args.text
    if args.input_text_file:
        with open(args.input_text_file, "r", encoding="utf-8") as file:
            text = file.read()
    text = (text or "").strip()
    if not text:
        text = DEFAULT_TEXT
    return text[:MAX_INPUT_CHARS]


def validate_bpm(bpm: int) -> int:
    if bpm < MIN_BPM or bpm > MAX_BPM:
        raise ValueError(f"BPM must be between {MIN_BPM} and {MAX_BPM}")
    return bpm


def main() -> int:
    try:
        args = parse_args()
        bpm = validate_bpm(args.bpm)
        text = load_text(args)

        bar_seconds = (60.0 / bpm) * 4.0
        progression = CHORD_PATTERNS[args.progression]

        melody_events, melody_end = build_melody_events(text)
        total_duration = min(MAX_SECONDS, max(bar_seconds * 3.0, melody_end, 1.0))
        total_samples = max(1, int(total_duration * SAMPLE_RATE))

        melody_track = array("f", [0.0]) * total_samples
        chord_track = array("f", [0.0]) * total_samples
        bass_track = array("f", [0.0]) * total_samples

        for start_sec, duration_sec, freq in melody_events:
            if start_sec >= total_duration:
                break
            duration = min(duration_sec, total_duration - start_sec)
            add_note(melody_track, start_sec, duration, freq, gain=0.30)

        for bar_idx, degree in enumerate(progression):
            chord_start = bar_idx * bar_seconds
            if chord_start >= total_duration:
                break
            chord_duration = min(bar_seconds, total_duration - chord_start)
            triad = TRIADS_C_MAJOR[degree]
            for midi_note in triad:
                add_note(chord_track, chord_start, chord_duration, midi_to_freq(midi_note), gain=0.12)
            add_note(
                bass_track,
                chord_start,
                chord_duration,
                midi_to_freq(triad[0] - 12),
                gain=0.18,
            )

        mix = array("f", [0.0]) * total_samples
        for i in range(total_samples):
            mix[i] = melody_track[i] + chord_track[i] + bass_track[i]

        write_wav(args.output, mix)
        return 0
    except Exception as exc:
        print(f"Error generating music file: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

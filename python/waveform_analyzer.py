#!/usr/bin/env python3
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
from core.audio_io import load_audio
from core.audio_utils import emit_result, convert_to_mono, resample_audio


def analyze_waveform(file_path, num_samples=500):
    try:
        audio_data, sr = load_audio(file_path)
    except Exception as e:
        emit_result({
            'success': False,
            'error': str(e),
            'file': file_path
        })
        return

    mono = convert_to_mono(audio_data)

    target_sr = 22050
    if sr > target_sr:
        mono = resample_audio(mono, sr, target_sr)
        sr = target_sr

    total_samples = len(mono)
    if total_samples == 0:
        emit_result({
            'success': False,
            'error': 'Empty audio file',
            'file': file_path
        })
        return

    block_size = max(1, total_samples // num_samples)
    peaks = []

    for i in range(num_samples):
        start = i * block_size
        end = min(start + block_size, total_samples)
        if start >= end:
            peaks.append(0.0)
            continue
        block = mono[start:end]
        peak = float(np.max(np.abs(block)))
        peaks.append(peak)

    max_peak = max(peaks) if peaks else 1.0
    if max_peak > 0:
        peaks = [p / max_peak for p in peaks]

    duration_seconds = len(mono) / sr

    emit_result({
        'success': True,
        'file': file_path,
        'sample_rate': sr,
        'duration': duration_seconds,
        'channels': audio_data.shape[1] if audio_data.ndim == 2 else 1,
        'total_samples': total_samples,
        'peaks': peaks,
        'num_peaks': len(peaks)
    })


def main():
    parser = argparse.ArgumentParser(description='Analyze audio waveform')
    parser.add_argument('--input', required=True, help='Input audio file path')
    parser.add_argument('--samples', type=int, default=500, help='Number of waveform samples')
    args = parser.parse_args()

    analyze_waveform(args.input, args.samples)


if __name__ == '__main__':
    main()

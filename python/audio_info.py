#!/usr/bin/env python3
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.audio_io import load_audio
from core.audio_utils import emit_result, convert_to_mono
import numpy as np


def get_audio_info(file_path):
    try:
        audio_data, sr = load_audio(file_path)
    except Exception as e:
        emit_result({
            'success': False,
            'error': str(e),
            'file': file_path
        })
        return

    duration = len(audio_data) / sr
    channels = audio_data.shape[1] if audio_data.ndim == 2 else 1
    file_size = os.path.getsize(file_path)

    mono = convert_to_mono(audio_data)
    rms = float(np.sqrt(np.mean(mono ** 2)))
    peak = float(np.max(np.abs(mono)))

    def dbfs(value):
        if value <= 0:
            return -float('inf')
        return 20 * np.log10(value)

    emit_result({
        'success': True,
        'file': file_path,
        'filename': os.path.basename(file_path),
        'sample_rate': sr,
        'duration': duration,
        'duration_formatted': format_duration(duration),
        'channels': channels,
        'file_size': file_size,
        'bit_depth': 16,
        'rms_dbfs': dbfs(rms),
        'peak_dbfs': dbfs(peak),
        'peak': peak
    })


def format_duration(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{ms:03d}"
    return f"{minutes:02d}:{secs:02d}.{ms:03d}"


def main():
    parser = argparse.ArgumentParser(description='Get audio file info')
    parser.add_argument('--input', required=True, help='Input audio file path')
    args = parser.parse_args()

    get_audio_info(args.input)


if __name__ == '__main__':
    main()

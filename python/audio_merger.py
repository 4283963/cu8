#!/usr/bin/env python3
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
from core.audio_io import load_audio, save_audio
from core.audio_utils import (
    emit_progress, emit_result, resample_audio, to_stereo,
    convert_to_mono, linear_fade, crossfade_tracks, normalize_audio
)


def process_track(track_config, target_sr):
    file_path = track_config['path']
    audio_data, sr = load_audio(file_path)

    if sr != target_sr:
        audio_data = resample_audio(audio_data, sr, target_sr)

    start_ms = track_config.get('trimStart', 0)
    end_ms = track_config.get('trimEnd', 0)
    duration_ms = len(audio_data) / target_sr * 1000

    start_sample = int(start_ms * target_sr / 1000)
    end_sample = len(audio_data) - int(end_ms * target_sr / 1000)

    start_sample = max(0, min(start_sample, len(audio_data)))
    end_sample = max(start_sample, min(end_sample, len(audio_data)))

    audio_data = audio_data[start_sample:end_sample]

    fade_in_ms = track_config.get('fadeIn', 0)
    fade_out_ms = track_config.get('fadeOut', 0)
    audio_data = linear_fade(audio_data, target_sr, fade_in_ms, fade_out_ms)

    volume = track_config.get('volume', 1.0)
    if volume != 1.0:
        audio_data = audio_data * volume

    force_mono = track_config.get('forceMono', False)
    if force_mono:
        audio_data = convert_to_mono(audio_data)
        audio_data = audio_data.reshape(-1, 1)
    else:
        audio_data = to_stereo(audio_data)

    return audio_data


def merge_tracks(tracks, target_sr, output_path, output_format,
                 global_crossfade=0, normalize=False, force_mono_output=False):
    if not tracks:
        emit_result({'success': False, 'error': 'No tracks to merge'})
        return

    emit_progress(5, '开始加载音频文件...')
    processed = []

    for i, track in enumerate(tracks):
        percent = 5 + (i / max(len(tracks), 1)) * 50
        emit_progress(percent, f'正在处理 [{i + 1}/{len(tracks)}]: {os.path.basename(track["path"])}')
        try:
            data = process_track(track, target_sr)
            processed.append(data)
        except Exception as e:
            emit_result({
                'success': False,
                'error': f'Failed to process track {track.get("name", track["path"])}: {str(e)}'
            })
            return

    emit_progress(58, '开始合并音轨...')

    result = processed[0]
    for i in range(1, len(processed)):
        percent = 60 + (i / max(len(processed) - 1, 1)) * 30
        emit_progress(percent, f'正在合并音轨 [{i + 1}/{len(processed)}]')

        crossfade_ms = tracks[i].get('crossfade', global_crossfade)
        result = crossfade_tracks(result, processed[i], target_sr, crossfade_ms)

    emit_progress(92, '最终处理...')

    if force_mono_output:
        result = convert_to_mono(result)
        result = result.reshape(-1, 1)

    if normalize:
        if result.ndim == 1:
            result = normalize_audio(result)
        else:
            for ch in range(result.shape[1]):
                result[:, ch] = normalize_audio(result[:, ch])

    emit_progress(96, '正在保存文件...')

    try:
        save_audio(output_path, result, target_sr)
    except Exception as e:
        emit_result({'success': False, 'error': f'Failed to save file: {str(e)}'})
        return

    duration = len(result) / target_sr
    emit_progress(100, '完成!')

    emit_result({
        'success': True,
        'output_path': output_path,
        'sample_rate': target_sr,
        'channels': result.shape[1] if result.ndim == 2 else 1,
        'duration': duration,
        'total_samples': len(result),
        'tracks_merged': len(tracks)
    })


def main():
    parser = argparse.ArgumentParser(description='Merge audio tracks with crossfade')
    parser.add_argument('--config', required=True, help='Path to JSON config file')
    args = parser.parse_args()

    try:
        with open(args.config, 'r', encoding='utf-8') as f:
            config = json.load(f)
    except Exception as e:
        emit_result({'success': False, 'error': f'Failed to load config: {str(e)}'})
        return

    tracks = config.get('tracks', [])
    output_path = config.get('outputPath')
    target_sr = config.get('sampleRate', 44100)
    output_format = config.get('format', 'wav')
    global_crossfade = config.get('crossfade', 0)
    normalize = config.get('normalize', False)
    force_mono = config.get('forceMono', False)

    if not output_path:
        emit_result({'success': False, 'error': 'Output path not specified'})
        return

    merge_tracks(tracks, target_sr, output_path, output_format,
                 global_crossfade, normalize, force_mono)


if __name__ == '__main__':
    main()

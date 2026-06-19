import json
import sys
import numpy as np

SUPPORTED_FORMATS = {'.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac', '.aiff'}


def emit_progress(percent, message=''):
    print(json.dumps({
        'type': 'progress',
        'percent': percent,
        'message': message
    }), flush=True)


def emit_result(data):
    print(json.dumps(data), flush=True)


def normalize_audio(audio_data):
    if audio_data.size == 0:
        return audio_data
    max_val = np.max(np.abs(audio_data))
    if max_val == 0:
        return audio_data
    return audio_data / max_val


def resample_audio(audio_data, original_sr, target_sr):
    if original_sr == target_sr:
        return audio_data
    duration = len(audio_data) / original_sr
    target_length = int(duration * target_sr)
    if audio_data.ndim == 1:
        indices = np.linspace(0, len(audio_data) - 1, target_length)
        return np.interp(indices, np.arange(len(audio_data)), audio_data)
    else:
        resampled = np.zeros((target_length, audio_data.shape[1]))
        indices = np.linspace(0, len(audio_data) - 1, target_length)
        for ch in range(audio_data.shape[1]):
            resampled[:, ch] = np.interp(indices, np.arange(len(audio_data)), audio_data[:, ch])
        return resampled


def convert_to_mono(audio_data):
    if audio_data.ndim == 1:
        return audio_data
    return np.mean(audio_data, axis=1)


def to_stereo(audio_data):
    if audio_data.ndim == 2 and audio_data.shape[1] >= 2:
        return audio_data[:, :2]
    stereo = np.column_stack([audio_data, audio_data])
    return stereo


def linear_fade(audio_data, sr, fade_in_ms=0, fade_out_ms=0):
    result = audio_data.copy()
    n_samples = len(result)

    if fade_in_ms > 0:
        fade_in_samples = min(int(sr * fade_in_ms / 1000), n_samples)
        fade_in_curve = np.linspace(0, 1, fade_in_samples)
        if result.ndim == 1:
            result[:fade_in_samples] *= fade_in_curve
        else:
            for ch in range(result.shape[1]):
                result[:fade_in_samples, ch] *= fade_in_curve

    if fade_out_ms > 0:
        fade_out_samples = min(int(sr * fade_out_ms / 1000), n_samples)
        fade_out_curve = np.linspace(1, 0, fade_out_samples)
        start_idx = n_samples - fade_out_samples
        if result.ndim == 1:
            result[start_idx:] *= fade_out_curve
        else:
            for ch in range(result.shape[1]):
                result[start_idx:, ch] *= fade_out_curve

    return result


def crossfade_tracks(track_a, track_b, sr, crossfade_ms):
    if crossfade_ms <= 0:
        return np.concatenate([track_a, track_b])

    cf_samples = int(sr * crossfade_ms / 1000)
    cf_samples = min(cf_samples, len(track_a), len(track_b))

    if cf_samples == 0:
        return np.concatenate([track_a, track_b])

    fade_out = np.linspace(1, 0, cf_samples)
    fade_in = np.linspace(0, 1, cf_samples)

    a_end = track_a[-cf_samples:]
    b_start = track_b[:cf_samples]

    if a_end.ndim == 1:
        overlapped = a_end * fade_out + b_start * fade_in
    else:
        overlapped = np.zeros_like(a_end)
        for ch in range(a_end.shape[1]):
            overlapped[:, ch] = a_end[:, ch] * fade_out + b_start[:, ch] * fade_in

    return np.concatenate([track_a[:-cf_samples], overlapped, track_b[cf_samples:]])

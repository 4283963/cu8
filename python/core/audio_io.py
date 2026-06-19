import os
import numpy as np

try:
    import soundfile as sf
    SOUNDFILE_AVAILABLE = True
except ImportError:
    SOUNDFILE_AVAILABLE = False

try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False


def load_audio(file_path):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()

    if ext == '.wav' and SOUNDFILE_AVAILABLE:
        data, sr = sf.read(file_path, always_2d=True)
        return data.astype(np.float64), sr

    if ext in ('.flac', '.ogg') and SOUNDFILE_AVAILABLE:
        data, sr = sf.read(file_path, always_2d=True)
        return data.astype(np.float64), sr

    if PYDUB_AVAILABLE:
        audio = AudioSegment.from_file(file_path)
        sr = audio.frame_rate
        samples = np.array(audio.get_array_of_samples(), dtype=np.float64)

        if audio.channels > 1:
            samples = samples.reshape(-1, audio.channels)
        else:
            samples = samples.reshape(-1, 1)

        max_val = float(1 << (8 * audio.sample_width - 1))
        if max_val > 0:
            samples = samples / max_val

        return samples, sr

    raise RuntimeError(
        "No suitable audio library available. "
        "Install soundfile (for WAV/FLAC/OGG) or pydub (for MP3/M4A/AAC)."
    )


def save_audio(file_path, audio_data, sample_rate):
    ext = os.path.splitext(file_path)[1].lower()
    directory = os.path.dirname(file_path)
    if directory and not os.path.exists(directory):
        os.makedirs(directory, exist_ok=True)

    if ext in ('.wav', '.flac', '.ogg') and SOUNDFILE_AVAILABLE:
        sf.write(file_path, audio_data.astype(np.float32), sample_rate)
        return

    if PYDUB_AVAILABLE:
        n_channels = audio_data.shape[1] if audio_data.ndim == 2 else 1
        sample_width = 2
        max_val = float(1 << (8 * sample_width - 1))

        int_data = (np.clip(audio_data, -1.0, 1.0) * max_val).astype(np.int16)
        audio = AudioSegment(
            int_data.tobytes(),
            frame_rate=sample_rate,
            sample_width=sample_width,
            channels=n_channels
        )

        if ext == '.mp3':
            audio.export(file_path, format='mp3', bitrate='320k')
        else:
            audio.export(file_path, format=ext.lstrip('.'))
        return

    raise RuntimeError(
        "No suitable audio library available for saving. "
        "Install soundfile or pydub."
    )

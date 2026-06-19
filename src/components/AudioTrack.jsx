import React, { useEffect, useState } from 'react';
import Waveform from './Waveform.jsx';
import { formatDuration } from '../utils/format';

export default function AudioTrack({ track, index, onUpdate, onRemove }) {
  const [audioInfo, setAudioInfo] = useState(null);
  const [waveform, setWaveform] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadInfo = async () => {
      if (!window.electronAPI) return;
      setLoading(true);
      try {
        const info = await window.electronAPI.getAudioInfo(track.path);
        if (!cancelled && info && info.success) {
          setAudioInfo(info);
          if (!track.duration) {
            onUpdate({ duration: info.duration });
          }
        }
        const wf = await window.electronAPI.analyzeWaveform(track.path);
        if (!cancelled && wf && wf.success) {
          setWaveform(wf);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadInfo();
    return () => { cancelled = true; };
  }, [track.path]);

  const handleParamChange = (key, value) => {
    const numValue = parseFloat(value) || 0;
    onUpdate({ [key]: Math.max(0, numValue) });
  };

  const duration = audioInfo?.duration || track.duration || 0;
  const maxTrimEnd = Math.max(0, duration - (track.trimStart || 0) - 0.1);

  return (
    <div className="audio-track">
      <div className="track-header">
        <div className="track-title">
          <span className="track-filename" title={track.path}>{track.name}</span>
          {audioInfo && (
            <span className="track-duration">
              {formatDuration(audioInfo.duration)} · {audioInfo.sample_rate}Hz · {audioInfo.channels}ch
            </span>
          )}
        </div>
        <button className="btn btn-sm btn-danger" onClick={onRemove} title="移除音轨">
          ×
        </button>
      </div>

      <div className="waveform-container">
        {loading ? (
          <div className="waveform-loading">加载波形中...</div>
        ) : waveform ? (
          <Waveform
            peaks={waveform.peaks}
            trimStart={track.trimStart || 0}
            trimEnd={track.trimEnd || 0}
            duration={duration}
          />
        ) : (
          <div className="waveform-placeholder">无法加载波形</div>
        )}
      </div>

      <div className="track-params">
        <div className="param-group">
          <label>起始裁剪 (ms)</label>
          <input
            type="number"
            min="0"
            max={duration * 1000}
            step="10"
            value={track.trimStart || 0}
            onChange={(e) => handleParamChange('trimStart', e.target.value)}
          />
        </div>
        <div className="param-group">
          <label>结束裁剪 (ms)</label>
          <input
            type="number"
            min="0"
            max={maxTrimEnd * 1000}
            step="10"
            value={track.trimEnd || 0}
            onChange={(e) => handleParamChange('trimEnd', e.target.value)}
          />
        </div>
        <div className="param-group">
          <label>淡入 (ms)</label>
          <input
            type="number"
            min="0"
            step="10"
            value={track.fadeIn || 0}
            onChange={(e) => handleParamChange('fadeIn', e.target.value)}
          />
        </div>
        <div className="param-group">
          <label>淡出 (ms)</label>
          <input
            type="number"
            min="0"
            step="10"
            value={track.fadeOut || 0}
            onChange={(e) => handleParamChange('fadeOut', e.target.value)}
          />
        </div>
        <div className="param-group">
          <label>交叉淡入淡出 (ms)</label>
          <input
            type="number"
            min="0"
            step="10"
            value={track.crossfade ?? ''}
            placeholder="使用全局"
            onChange={(e) => {
              const val = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
              onUpdate({ crossfade: val });
            }}
          />
        </div>
        <div className="param-group">
          <label>音量</label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={track.volume ?? 1}
            onChange={(e) => handleParamChange('volume', e.target.value)}
          />
          <span className="volume-value">{((track.volume ?? 1) * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

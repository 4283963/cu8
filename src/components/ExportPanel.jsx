import React from 'react';

export default function ExportPanel({ tracks, config, onConfigChange, onStart, onCancel, isMerging, isCancelling, progress }) {
  const handleSaveAs = async () => {
    if (!window.electronAPI) return;
    const ext = config.format;
    const defaultName = `merged_audio_${Date.now()}.${ext}`;
    const path = await window.electronAPI.saveFileDialog(defaultName);
    if (path) {
      onConfigChange({ outputPath: path });
    }
  };

  const canMerge = tracks.length > 0 && config.outputPath && !isMerging;
  const canCancel = isMerging && !isCancelling;
  const progressPct = progress?.percent ?? 0;
  const progressMsg = progress?.message ?? '';
  const isCancelled = progress?.cancelled === true;

  const totalDuration = tracks.reduce((acc, t) => {
    const d = (t.duration || 0) - ((t.trimStart || 0) + (t.trimEnd || 0)) / 1000;
    return acc + Math.max(0, d);
  }, 0);

  return (
    <div className="export-panel">
      <div className="export-grid">
        <div className="param-group">
          <label>输出格式</label>
          <select
            value={config.format}
            onChange={(e) => onConfigChange({ format: e.target.value })}
            disabled={isMerging}
          >
            <option value="wav">WAV (无损)</option>
            <option value="flac">FLAC (无损压缩)</option>
            <option value="mp3">MP3 (320kbps)</option>
            <option value="ogg">OGG</option>
          </select>
        </div>

        <div className="param-group">
          <label>采样率</label>
          <select
            value={config.sampleRate}
            onChange={(e) => onConfigChange({ sampleRate: parseInt(e.target.value, 10) })}
            disabled={isMerging}
          >
            <option value={44100}>44100 Hz (CD)</option>
            <option value={48000}>48000 Hz</option>
            <option value={96000}>96000 Hz (高解析)</option>
          </select>
        </div>

        <div className="param-group">
          <label>全局交叉淡入淡出 (ms)</label>
          <input
            type="number"
            min="0"
            step="50"
            value={config.crossfade}
            onChange={(e) => onConfigChange({ crossfade: Math.max(0, parseFloat(e.target.value) || 0) })}
            disabled={isMerging}
          />
        </div>

        <div className="param-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={config.normalize}
              onChange={(e) => onConfigChange({ normalize: e.target.checked })}
              disabled={isMerging}
            />
            自动音量归一化
          </label>
        </div>

        <div className="param-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={config.forceMono}
              onChange={(e) => onConfigChange({ forceMono: e.target.checked })}
              disabled={isMerging}
            />
            强制单声道输出
          </label>
        </div>
      </div>

      <div className="output-path-row">
        <div className="output-path-display">
          <strong>输出路径: </strong>
          {config.outputPath ? (
            <span className="path">{config.outputPath}</span>
          ) : (
            <span className="path-placeholder">未选择输出文件</span>
          )}
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleSaveAs}
          disabled={isMerging}
        >
          另存为...
        </button>
      </div>

      <div className="summary-row">
        <span>📊 预计合并: <strong>{tracks.length}</strong> 个音轨</span>
        {totalDuration > 0 && <span>⏱️ 总时长约: <strong>{(totalDuration).toFixed(2)}</strong> 秒</span>}
      </div>

      {isMerging && (
        <div className="progress-container">
          <div className={`progress-bar ${isCancelling ? 'cancelling' : ''} ${isCancelled ? 'cancelled' : ''}`}>
            <div
              className="progress-fill"
              style={{ width: `${isCancelling || isCancelled ? 100 : progressPct}%` }}
            />
          </div>
          <div className="progress-text">
            {isCancelling ? '⏳ 正在终止后台 Python 进程...' : progressMsg || `处理中... ${progressPct.toFixed(0)}%`}
          </div>
        </div>
      )}

      <div className="export-actions">
        <button
          className="btn btn-primary btn-large"
          onClick={onStart}
          disabled={!canMerge}
        >
          {isMerging ? '🔄 处理中...' : '🚀 开始合并导出'}
        </button>
        {canCancel && (
          <button
            className="btn btn-danger btn-large"
            onClick={onCancel}
          >
            ⏹ 取消合并
          </button>
        )}
      </div>
    </div>
  );
}

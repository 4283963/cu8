import React, { useState, useEffect, useCallback } from 'react';

export default function FolderMonitor({ status, onStatusChange }) {
  const [selectedPath, setSelectedPath] = useState(status?.path || '');
  const [autoEnqueue, setAutoEnqueue] = useState(status?.autoEnqueue !== false);
  const [scanExisting, setScanExisting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status) {
      setSelectedPath(status.path || selectedPath);
    }
  }, [status?.path]);

  const handleSelectFolder = async () => {
    if (!window.electronAPI || !window.electronAPI.selectFolderDialog) return;
    const folder = await window.electronAPI.selectFolderDialog('选择要监视的音频文件夹');
    if (folder) {
      setSelectedPath(folder);
      setError('');
    }
  };

  const handleStart = async () => {
    if (!window.electronAPI?.folderWatchStart) return;
    if (!selectedPath) {
      setError('请先选择要监视的文件夹');
      return;
    }
    setError('');
    const result = await window.electronAPI.folderWatchStart(selectedPath, {
      autoEnqueue,
      scanExisting
    });
    if (!result.success) {
      setError(result.error || '启动监视失败');
    }
    if (result.status && onStatusChange) {
      onStatusChange(result.status);
    }
  };

  const handleStop = async () => {
    if (!window.electronAPI?.folderWatchStop) return;
    const result = await window.electronAPI.folderWatchStop();
    if (result.status && onStatusChange) {
      onStatusChange(result.status);
    }
  };

  const handleRescan = async () => {
    if (!window.electronAPI?.folderWatchRescan) return;
    const result = await window.electronAPI.folderWatchRescan();
    if (result.status && onStatusChange) {
      onStatusChange(result.status);
    }
  };

  const handleClearProcessed = async () => {
    if (!window.electronAPI?.folderWatchClearProcessed) return;
    const result = await window.electronAPI.folderWatchClearProcessed();
    if (result.status && onStatusChange) {
      onStatusChange(result.status);
    }
  };

  const toggleAutoEnqueue = async (checked) => {
    setAutoEnqueue(checked);
    if (window.electronAPI?.folderWatchSetAutoEnqueue) {
      const result = await window.electronAPI.folderWatchSetAutoEnqueue(checked);
      if (result.status && onStatusChange) {
        onStatusChange(result.status);
      }
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('zh-CN', { hour12: false });
  };

  const getEntryIcon = (type) => {
    switch (type) {
      case 'added': return '🎵';
      case 'system': return 'ℹ️';
      case 'error': return '❌';
      case 'failed': return '⚠️';
      default: return '📝';
    }
  };

  const recent = status?.recent || [];

  return (
    <div className="folder-monitor">
      <div className="folder-monitor-header">
        <div className="monitor-status">
          {status?.watched ? (
            <span className="status-indicator status-running">● 监视中</span>
          ) : (
            <span className="status-indicator status-stopped">● 未运行</span>
          )}
          <span className="monitor-count">
            已检测: <strong>{status?.detectedCount || 0}</strong> 个文件
          </span>
        </div>
      </div>

      <div className="folder-select-row">
        <div className="folder-path-input">
          <strong>监视文件夹: </strong>
          <span className="folder-path-text">
            {selectedPath || <em className="path-placeholder">未选择</em>}
          </span>
        </div>
        <button className="btn btn-sm btn-secondary" onClick={handleSelectFolder}>
          选择...
        </button>
      </div>

      <div className="monitor-options">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={autoEnqueue}
            onChange={(e) => toggleAutoEnqueue(e.target.checked)}
          />
          <span>检测到音频自动加入合并队列</span>
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={scanExisting}
            onChange={(e) => setScanExisting(e.target.checked)}
            disabled={status?.watched}
          />
          <span>启动时扫描文件夹现有音频</span>
        </label>
      </div>

      {error && <div className="monitor-error">错误: {error}</div>}

      <div className="monitor-actions">
        {!status?.watched ? (
          <button className="btn btn-primary" onClick={handleStart} disabled={!selectedPath}>
            ▶️ 启动监视
          </button>
        ) : (
          <button className="btn btn-danger" onClick={handleStop}>
            ⏹️ 停止监视
          </button>
        )}
        <button
          className="btn btn-secondary"
          onClick={handleRescan}
          disabled={!status?.watched}
        >
          🔄 手动扫描
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleClearProcessed}
          disabled={!status?.watched}
        >
          🧹 清除已处理记录
        </button>
      </div>

      <div className="monitor-log">
        <div className="log-title">最近活动日志</div>
        <div className="log-list">
          {recent.length === 0 ? (
            <div className="log-empty">暂无活动，启动监视后这里会显示检测到的文件</div>
          ) : (
            recent.map((entry) => (
              <div key={entry.id} className={`log-item log-${entry.type}`}>
                <span className="log-icon">{getEntryIcon(entry.type)}</span>
                <span className="log-time">{formatTime(entry.time)}</span>
                <span className="log-name" title={entry.filePath}>{entry.name}</span>
                {entry.note && <span className="log-note">— {entry.note}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

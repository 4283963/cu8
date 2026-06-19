import React from 'react';
import { formatFileSize } from '../utils/format';

export default function FileList({ files, onRemove, onAddToTrack }) {
  if (files.length === 0) {
    return (
      <div className="empty-state">
        <p>暂无音频文件</p>
        <p className="hint">点击上方按钮添加音频文件</p>
      </div>
    );
  }

  return (
    <div className="file-list">
      {files.map((file) => (
        <div key={file.id} className="file-item">
          <div className="file-info">
            <span className="file-icon">🎧</span>
            <div className="file-meta">
              <div className="file-name" title={file.path}>{file.name}</div>
              <div className="file-size">{formatFileSize(file.size)}</div>
            </div>
          </div>
          <div className="file-actions">
            <button
              className="btn btn-sm btn-success"
              onClick={() => onAddToTrack(file)}
              title="添加到队列"
            >
              + 队列
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => onRemove(file.id)}
              title="从库中移除"
            >
              移除
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

import React from 'react';
import AudioTrack from './AudioTrack.jsx';

export default function TrackList({ tracks, onUpdate, onRemove, onMove }) {
  if (tracks.length === 0) {
    return (
      <div className="empty-state">
        <p>合并队列为空</p>
        <p className="hint">从上方文件库点击 "+ 队列" 添加音轨</p>
      </div>
    );
  }

  const handleMoveUp = (index) => {
    if (index > 0) {
      onMove(index, index - 1);
    }
  };

  const handleMoveDown = (index) => {
    if (index < tracks.length - 1) {
      onMove(index, index + 1);
    }
  };

  return (
    <div className="track-list">
      {tracks.map((track, index) => (
        <div key={track.id} className="track-wrapper">
          <div className="track-order">
            <span className="order-number">#{index + 1}</span>
            <div className="move-buttons">
              <button
                className="btn btn-xs"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                title="上移"
              >
                ↑
              </button>
              <button
                className="btn btn-xs"
                onClick={() => handleMoveDown(index)}
                disabled={index === tracks.length - 1}
                title="下移"
              >
                ↓
              </button>
            </div>
          </div>
          <AudioTrack
            track={track}
            index={index}
            onUpdate={(updates) => onUpdate(track.id, updates)}
            onRemove={() => onRemove(track.id)}
          />
        </div>
      ))}
    </div>
  );
}

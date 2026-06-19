import React, { useState, useEffect } from 'react';
import { useAudioQueue } from './hooks/useAudioQueue';
import FileList from './components/FileList.jsx';
import TrackList from './components/TrackList.jsx';
import ExportPanel from './components/ExportPanel.jsx';
import './styles/App.css';

export default function App() {
  const {
    files,
    tracks,
    outputConfig,
    mergeProgress,
    isMerging,
    addFiles,
    removeFile,
    addTrack,
    removeTrack,
    updateTrack,
    moveTrack,
    updateOutputConfig,
    startMerge,
    setMergeProgress
  } = useAudioQueue();

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onMergeProgress((progress) => {
        setMergeProgress(progress);
      });
    }
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeMergeProgressListener();
      }
    };
  }, [setMergeProgress]);

  const handleSelectFiles = async () => {
    if (!window.electronAPI) {
      alert('请在 Electron 环境中运行此应用');
      return;
    }
    const selected = await window.electronAPI.selectAudioFiles();
    if (selected && selected.length > 0) {
      addFiles(selected);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎵 CU8 音频合并管理器</h1>
        <p className="subtitle">多轨音频片段合并与交叉淡入淡出排队管理器</p>
      </header>

      <main className="app-main">
        <section className="panel">
          <div className="panel-header">
            <h2>📁 音频文件库</h2>
            <button className="btn btn-primary" onClick={handleSelectFiles}>
              + 添加音频文件
            </button>
          </div>
          <FileList
            files={files}
            onRemove={removeFile}
            onAddToTrack={addTrack}
          />
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>🎚️ 合并队列</h2>
            <span className="badge">{tracks.length} 个音轨</span>
          </div>
          <TrackList
            tracks={tracks}
            onUpdate={updateTrack}
            onRemove={removeTrack}
            onMove={moveTrack}
          />
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>⚙️ 导出设置</h2>
          </div>
          <ExportPanel
            tracks={tracks}
            config={outputConfig}
            onConfigChange={updateOutputConfig}
            onStart={startMerge}
            isMerging={isMerging}
            progress={mergeProgress}
          />
        </section>
      </main>
    </div>
  );
}

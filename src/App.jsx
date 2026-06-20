import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioQueue } from './hooks/useAudioQueue';
import FileList from './components/FileList.jsx';
import TrackList from './components/TrackList.jsx';
import ExportPanel from './components/ExportPanel.jsx';
import FolderMonitor from './components/FolderMonitor.jsx';
import './styles/App.css';

export default function App() {
  const {
    files,
    tracks,
    outputConfig,
    mergeProgress,
    isMerging,
    isCancelling,
    addFiles,
    addFromWatchedFile,
    removeFile,
    addTrack,
    removeTrack,
    updateTrack,
    moveTrack,
    updateOutputConfig,
    startMerge,
    cancelMerge,
    setMergeProgress
  } = useAudioQueue();

  const [folderWatchStatus, setFolderWatchStatus] = useState({
    watched: false,
    path: null,
    detectedCount: 0,
    autoEnqueue: true,
    recent: []
  });

  const addFromWatchedRef = useRef(addFromWatchedFile);
  useEffect(() => {
    addFromWatchedRef.current = addFromWatchedFile;
  }, [addFromWatchedFile]);

  useEffect(() => {
    if (!window.electronAPI) return;
    if (window.electronAPI.folderWatchStatus) {
      window.electronAPI.folderWatchStatus().then((s) => {
        if (s) setFolderWatchStatus(s);
      });
    }
  }, []);

  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.onMergeProgress) return;
    const unsubscribe = window.electronAPI.onMergeProgress((progress) => {
      setMergeProgress(progress);
    });
    return () => {
      unsubscribe && unsubscribe();
      if (window.electronAPI.removeMergeProgressListener) {
        window.electronAPI.removeMergeProgressListener();
      }
    };
  }, [setMergeProgress]);

  useEffect(() => {
    if (!window.electronAPI) return;
    const api = window.electronAPI;
    const unsubscribers = [];

    if (api.onWatchedStatusChange) {
      unsubscribers.push(
        api.onWatchedStatusChange((status) => {
          if (status) setFolderWatchStatus(status);
        })
      );
    }

    if (api.onWatchedNewFile) {
      unsubscribers.push(
        api.onWatchedNewFile((fileInfo) => {
          if (fileInfo && addFromWatchedRef.current) {
            addFromWatchedRef.current(fileInfo);
          }
        })
      );
    }

    return () => {
      for (const unsub of unsubscribers) {
        try { unsub(); } catch (_e) { /* noop */ }
      }
    };
  }, []);

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

  const handleFolderStatusChange = useCallback((status) => {
    if (status) setFolderWatchStatus(status);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎵 CU8 音频合并管理器</h1>
        <p className="subtitle">多轨音频片段合并与交叉淡入淡出排队管理器</p>
      </header>

      <main className="app-main">
        <section className="panel">
          <div className="panel-header">
            <h2>👁️ 文件夹自动监视</h2>
          </div>
          <FolderMonitor
            status={folderWatchStatus}
            onStatusChange={handleFolderStatusChange}
          />
        </section>

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
            onCancel={cancelMerge}
            isMerging={isMerging}
            isCancelling={isCancelling}
            progress={mergeProgress}
          />
        </section>
      </main>
    </div>
  );
}

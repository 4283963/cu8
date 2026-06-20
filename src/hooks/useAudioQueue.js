import { useState, useCallback } from 'react';

function generateId() {
  return `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createTrackFromFile(file) {
  return {
    id: generateId(),
    fileId: file.id,
    name: file.name,
    path: file.path,
    duration: 0,
    trimStart: 0,
    trimEnd: 0,
    fadeIn: 0,
    fadeOut: 0,
    crossfade: null,
    volume: 1.0,
    forceMono: false
  };
}

export function useAudioQueue() {
  const [files, setFiles] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [outputConfig, setOutputConfig] = useState({
    format: 'wav',
    sampleRate: 44100,
    crossfade: 500,
    normalize: true,
    forceMono: false,
    outputPath: null
  });
  const [mergeProgress, setMergeProgress] = useState({ percent: 0, message: '' });
  const [isMerging, setIsMerging] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const addFiles = useCallback((newFiles) => {
    setFiles((prev) => {
      const existingPaths = new Set(prev.map(f => f.path));
      const unique = newFiles.filter(f => !existingPaths.has(f.path));
      return [...prev, ...unique];
    });
  }, []);

  const removeFile = useCallback((fileId) => {
    setFiles((prev) => prev.filter(f => f.id !== fileId));
    setTracks((prev) => prev.filter(t => t.fileId !== fileId));
  }, []);

  const addTrack = useCallback((file) => {
    setTracks((prev) => [...prev, createTrackFromFile(file)]);
  }, []);

  const addFromWatchedFile = useCallback((watchedFile) => {
    if (!watchedFile || !watchedFile.path) return { fileAdded: false, trackAdded: false };

    let fileAdded = false;
    let trackAdded = false;

    setFiles((prev) => {
      const existingPaths = new Set(prev.map(f => f.path));
      if (existingPaths.has(watchedFile.path)) {
        return prev;
      }
      fileAdded = true;
      return [...prev, { ...watchedFile, source: watchedFile.source || 'watch' }];
    });

    setTracks((prev) => {
      const existingTrackPaths = new Set(prev.map(t => t.path));
      if (existingTrackPaths.has(watchedFile.path)) {
        return prev;
      }
      trackAdded = true;
      return [...prev, createTrackFromFile(watchedFile)];
    });

    return { fileAdded, trackAdded };
  }, []);

  const removeTrack = useCallback((trackId) => {
    setTracks((prev) => prev.filter(t => t.id !== trackId));
  }, []);

  const updateTrack = useCallback((trackId, updates) => {
    setTracks((prev) =>
      prev.map(t => (t.id === trackId ? { ...t, ...updates } : t))
    );
  }, []);

  const moveTrack = useCallback((fromIndex, toIndex) => {
    setTracks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const updateOutputConfig = useCallback((updates) => {
    setOutputConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const startMerge = useCallback(async () => {
    if (tracks.length === 0 || !outputConfig.outputPath || isMerging) return;

    setIsMerging(true);
    setIsCancelling(false);
    setMergeProgress({ percent: 0, message: '初始化...' });

    try {
      const config = {
        tracks: tracks.map(t => ({
          path: t.path,
          name: t.name,
          trimStart: t.trimStart || 0,
          trimEnd: t.trimEnd || 0,
          fadeIn: t.fadeIn || 0,
          fadeOut: t.fadeOut || 0,
          crossfade: t.crossfade,
          volume: t.volume ?? 1.0,
          forceMono: t.forceMono || false
        })),
        outputPath: outputConfig.outputPath,
        format: outputConfig.format,
        sampleRate: outputConfig.sampleRate,
        crossfade: outputConfig.crossfade,
        normalize: outputConfig.normalize,
        forceMono: outputConfig.forceMono
      };

      const result = await window.electronAPI.mergeAudioTracks(config);

      if (result && result.success) {
        setMergeProgress({ percent: 100, message: `完成！文件已保存: ${result.output_path}` });
      } else if (result && result.cancelled) {
        setMergeProgress({ percent: 0, message: '任务已取消', cancelled: true });
      } else {
        setMergeProgress({ percent: 0, message: `错误: ${result?.error || '未知错误'}` });
      }
    } catch (error) {
      if (error && error.cancelled) {
        setMergeProgress({ percent: 0, message: '任务已取消', cancelled: true });
      } else {
        setMergeProgress({ percent: 0, message: `错误: ${error.message}` });
      }
    } finally {
      setIsMerging(false);
      setIsCancelling(false);
    }
  }, [tracks, outputConfig, isMerging]);

  const cancelMerge = useCallback(async () => {
    if (!isMerging || isCancelling) return;
    if (!window.electronAPI || !window.electronAPI.cancelMerge) return;

    setIsCancelling(true);
    setMergeProgress((prev) => ({ ...prev, message: '正在终止后台进程...' }));

    try {
      await window.electronAPI.cancelMerge();
    } catch (_e) {
      setIsCancelling(false);
    }
  }, [isMerging, isCancelling]);

  return {
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
  };
}

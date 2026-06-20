const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectAudioFiles: () => ipcRenderer.invoke('dialog:selectAudioFiles'),
  selectOutputDirectory: () => ipcRenderer.invoke('dialog:selectOutputDirectory'),
  selectFolderDialog: () => ipcRenderer.invoke('dialog:selectFolder'),
  saveFileDialog: (defaultName) => ipcRenderer.invoke('dialog:saveFile', defaultName),

  analyzeWaveform: (filePath) => ipcRenderer.invoke('audio:analyzeWaveform', filePath),
  getAudioInfo: (filePath) => ipcRenderer.invoke('audio:getInfo', filePath),
  mergeAudioTracks: (config) => ipcRenderer.invoke('audio:mergeTracks', config),
  cancelMerge: () => ipcRenderer.invoke('audio:cancelMerge'),

  folderWatchStart: (folderPath, options) => ipcRenderer.invoke('folderWatch:start', folderPath, options),
  folderWatchStop: () => ipcRenderer.invoke('folderWatch:stop'),
  folderWatchStatus: () => ipcRenderer.invoke('folderWatch:status'),
  folderWatchRescan: () => ipcRenderer.invoke('folderWatch:rescan'),
  folderWatchSetAutoEnqueue: (value) => ipcRenderer.invoke('folderWatch:setAutoEnqueue', value),
  folderWatchClearProcessed: () => ipcRenderer.invoke('folderWatch:clearProcessed'),

  onMergeProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on('audio:mergeProgress', handler);
    return () => ipcRenderer.removeListener('audio:mergeProgress', handler);
  },
  removeMergeProgressListener: () => {
    ipcRenderer.removeAllListeners('audio:mergeProgress');
  },

  onWatchedNewFile: (callback) => {
    const handler = (_event, fileInfo) => callback(fileInfo);
    ipcRenderer.on('folderWatch:newFile', handler);
    return () => ipcRenderer.removeListener('folderWatch:newFile', handler);
  },
  onWatchedStatusChange: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('folderWatch:status', handler);
    return () => ipcRenderer.removeListener('folderWatch:status', handler);
  }
});

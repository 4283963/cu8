const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectAudioFiles: () => ipcRenderer.invoke('dialog:selectAudioFiles'),
  selectOutputDirectory: () => ipcRenderer.invoke('dialog:selectOutputDirectory'),
  saveFileDialog: (defaultName) => ipcRenderer.invoke('dialog:saveFile', defaultName),

  analyzeWaveform: (filePath) => ipcRenderer.invoke('audio:analyzeWaveform', filePath),
  getAudioInfo: (filePath) => ipcRenderer.invoke('audio:getInfo', filePath),
  mergeAudioTracks: (config) => ipcRenderer.invoke('audio:mergeTracks', config),
  cancelMerge: () => ipcRenderer.invoke('audio:cancelMerge'),

  onMergeProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on('audio:mergeProgress', handler);
    return () => ipcRenderer.removeListener('audio:mergeProgress', handler);
  },
  removeMergeProgressListener: () => {
    ipcRenderer.removeAllListeners('audio:mergeProgress');
  }
});

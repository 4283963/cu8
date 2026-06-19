const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectAudioFiles: () => ipcRenderer.invoke('dialog:selectAudioFiles'),
  selectOutputDirectory: () => ipcRenderer.invoke('dialog:selectOutputDirectory'),
  saveFileDialog: (defaultName) => ipcRenderer.invoke('dialog:saveFile', defaultName),

  analyzeWaveform: (filePath) => ipcRenderer.invoke('audio:analyzeWaveform', filePath),
  getAudioInfo: (filePath) => ipcRenderer.invoke('audio:getInfo', filePath),
  mergeAudioTracks: (config) => ipcRenderer.invoke('audio:mergeTracks', config),

  onMergeProgress: (callback) => {
    ipcRenderer.on('audio:mergeProgress', (_event, progress) => callback(progress));
  },
  removeMergeProgressListener: () => {
    ipcRenderer.removeAllListeners('audio:mergeProgress');
  }
});

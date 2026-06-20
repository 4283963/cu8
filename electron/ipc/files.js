const path = require('path');

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.wma', '.aiff'];

function registerFileHandlers(ipcMain, dialog) {
  ipcMain.handle('dialog:selectAudioFiles', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '音频文件', extensions: AUDIO_EXTENSIONS.map(ext => ext.slice(1)) },
        { name: '所有文件', extensions: ['*'] }
      ]
    });

    if (result.canceled) return [];

    return result.filePaths.map(filePath => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: path.basename(filePath),
      path: filePath,
      size: require('fs').statSync(filePath).size,
      extension: path.extname(filePath).toLowerCase()
    }));
  });

  ipcMain.handle('dialog:selectOutputDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:selectFolder', async (_event, title = '选择文件夹') => {
    const result = await dialog.showOpenDialog({
      title,
      properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:saveFile', async (_event, defaultName = 'merged_audio.wav') => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [
        { name: 'WAV', extensions: ['wav'] },
        { name: 'MP3', extensions: ['mp3'] },
        { name: 'FLAC', extensions: ['flac'] },
        { name: 'OGG', extensions: ['ogg'] }
      ]
    });
    return result.canceled ? null : result.filePath;
  });
}

module.exports = { registerFileHandlers };

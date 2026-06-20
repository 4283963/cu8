const path = require('path');
const fs = require('fs');
const { globalWatcher } = require('../utils/folderWatcher');

function registerFolderWatchHandlers(ipcMain, mainWindow) {
  const sendNewAudio = (fileInfo) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('folderWatch:newFile', fileInfo);
    }
  };
  const sendStatus = (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('folderWatch:status', status);
    }
  };

  if (!globalWatcher.onNewAudioFile) globalWatcher.onNewAudioFile = sendNewAudio;
  if (!globalWatcher.onStatusChange) globalWatcher.onStatusChange = sendStatus;

  ipcMain.handle('folderWatch:start', async (_event, folderPath, options = {}) => {
    try {
      const resolved = folderPath && fs.existsSync(folderPath)
        ? path.resolve(folderPath)
        : null;
      if (!resolved) {
        return { success: false, error: '文件夹路径无效' };
      }
      const stat = fs.statSync(resolved);
      if (!stat.isDirectory()) {
        return { success: false, error: '路径不是文件夹' };
      }
      const status = globalWatcher.start(resolved, {
        autoEnqueue: options.autoEnqueue !== false,
        scanExisting: !!options.scanExisting
      });
      return { success: true, status };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('folderWatch:stop', async () => {
    globalWatcher.stop(false);
    return { success: true, status: globalWatcher.getStatus() };
  });

  ipcMain.handle('folderWatch:status', async () => {
    return globalWatcher.getStatus();
  });

  ipcMain.handle('folderWatch:rescan', async () => {
    const count = globalWatcher.rescanExisting();
    return { success: true, scanned: count, status: globalWatcher.getStatus() };
  });

  ipcMain.handle('folderWatch:setAutoEnqueue', async (_event, value) => {
    globalWatcher.setAutoEnqueue(value);
    return { success: true, status: globalWatcher.getStatus() };
  });

  ipcMain.handle('folderWatch:clearProcessed', async () => {
    globalWatcher.clearProcessed();
    return { success: true, status: globalWatcher.getStatus() };
  });
}

function shutdownFolderWatcher() {
  globalWatcher.stop(true);
}

module.exports = { registerFolderWatchHandlers, shutdownFolderWatcher };

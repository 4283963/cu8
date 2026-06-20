const path = require('path');
const os = require('os');
const fs = require('fs');
const { runPythonScript, CancelledError } = require('../utils/pythonRunner');

let currentTask = null;

function clearCurrentTask() {
  currentTask = null;
}

function cleanupTempConfig(tempConfigPath) {
  try {
    if (tempConfigPath && fs.existsSync(tempConfigPath)) {
      fs.unlinkSync(tempConfigPath);
    }
  } catch (_e) {
  }
}

function registerAudioHandlers(ipcMain, mainWindow) {
  const sendProgress = (progressData) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('audio:mergeProgress', progressData);
    }
  };

  ipcMain.handle('audio:analyzeWaveform', async (_event, filePath) => {
    try {
      const handle = runPythonScript('waveform_analyzer.py', [
        '--input', filePath,
        '--samples', '500'
      ]);
      const result = await handle.promise;
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('audio:getInfo', async (_event, filePath) => {
    try {
      const handle = runPythonScript('audio_info.py', [
        '--input', filePath
      ]);
      const result = await handle.promise;
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('audio:mergeTracks', async (_event, config) => {
    if (currentTask) {
      return { success: false, error: '已有合并任务正在运行，请先取消' };
    }

    const tempConfigPath = path.join(
      os.tmpdir(),
      `cu8_merge_config_${Date.now()}.json`
    );
    fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2));

    const handle = runPythonScript(
      'audio_merger.py',
      ['--config', tempConfigPath],
      sendProgress
    );

    currentTask = { handle, tempConfigPath, cancelled: false };

    try {
      const result = await handle.promise;
      return result;
    } catch (error) {
      if (error instanceof CancelledError || handle.cancelled) {
        return { success: false, cancelled: true, error: '任务已取消' };
      }
      return { success: false, error: error.message };
    } finally {
      clearCurrentTask();
      cleanupTempConfig(tempConfigPath);
    }
  });

  ipcMain.handle('audio:cancelMerge', async () => {
    if (!currentTask) {
      return { success: false, message: '当前没有正在运行的任务' };
    }
    const { handle } = currentTask;
    currentTask.cancelled = true;
    const killed = handle.cancel();
    return { success: true, killed, message: killed ? '已发送终止信号' : '任务已结束' };
  });
}

function cleanupAllTasks() {
  if (currentTask && currentTask.handle) {
    currentTask.cancelled = true;
    currentTask.handle.cancel();
  }
  currentTask = null;
}

module.exports = { registerAudioHandlers, cleanupAllTasks };

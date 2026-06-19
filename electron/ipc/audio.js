const { runPythonScript } = require('../utils/pythonRunner');

function registerAudioHandlers(ipcMain, mainWindow) {
  ipcMain.handle('audio:analyzeWaveform', async (_event, filePath) => {
    try {
      const result = await runPythonScript('waveform_analyzer.py', [
        '--input', filePath,
        '--samples', '500'
      ]);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('audio:getInfo', async (_event, filePath) => {
    try {
      const result = await runPythonScript('audio_info.py', [
        '--input', filePath
      ]);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('audio:mergeTracks', async (_event, config) => {
    const tempConfigPath = require('path').join(
      require('os').tmpdir(),
      `cu8_merge_config_${Date.now()}.json`
    );
    require('fs').writeFileSync(tempConfigPath, JSON.stringify(config, null, 2));

    const onProgress = (progressData) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('audio:mergeProgress', progressData);
      }
    };

    try {
      const result = await runPythonScript(
        'audio_merger.py',
        ['--config', tempConfigPath],
        onProgress
      );
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      try {
        require('fs').unlinkSync(tempConfigPath);
      } catch (_e) {
      }
    }
  });
}

module.exports = { registerAudioHandlers };

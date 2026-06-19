const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function getPythonPath() {
  const isDev = process.env.NODE_ENV === 'development';
  const possiblePaths = isDev
    ? [path.join(__dirname, '..', '..', 'python')]
    : [
        path.join(process.resourcesPath, 'python'),
        path.join(__dirname, '..', '..', 'python')
      ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, '..', '..', 'python');
}

function runPythonScript(scriptName, args, onProgress) {
  return new Promise((resolve, reject) => {
    const pythonDir = getPythonPath();
    const scriptPath = path.join(pythonDir, scriptName);

    const python = process.platform === 'win32' ? 'python' : 'python3';
    const cmdArgs = [scriptPath, ...args];

    const process_ = spawn(python, cmdArgs, {
      cwd: pythonDir,
      env: { ...process.env }
    });

    let stdoutData = '';
    let stderrData = '';

    process_.stdout.on('data', (data) => {
      const text = data.toString();
      stdoutData += text;

      if (onProgress) {
        const lines = text.trim().split('\n');
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed && parsed.type === 'progress') {
              onProgress(parsed);
            }
          } catch (_e) {
          }
        }
      }
    });

    process_.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    process_.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}: ${stderrData}`));
        return;
      }

      try {
        const lastJsonLine = stdoutData
          .trim()
          .split('\n')
          .filter(line => {
            try { JSON.parse(line); return true; } catch (_e) { return false; }
          })
          .pop();

        if (lastJsonLine) {
          resolve(JSON.parse(lastJsonLine));
        } else {
          resolve({ success: true });
        }
      } catch (e) {
        reject(new Error(`Failed to parse Python output: ${e.message}\nRaw output: ${stdoutData}`));
      }
    });

    process_.on('error', (err) => {
      reject(new Error(`Failed to start Python: ${err.message}`));
    });
  });
}

module.exports = { runPythonScript, getPythonPath };

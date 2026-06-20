const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

function getPythonPath() {
  const isDev = process.env.NODE_ENV === 'development';
  const devPath = path.join(__dirname, '..', '..', 'python');
  const possiblePaths = isDev
    ? [devPath]
    : [
        process.resourcesPath ? path.join(process.resourcesPath, 'python') : null,
        devPath
      ].filter(Boolean);

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return devPath;
}

function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      exec(`taskkill /PID ${pid} /T /F`, () => {});
    } else {
      try {
        process.kill(-pid, 'SIGTERM');
      } catch (_e) {
        process.kill(pid, 'SIGTERM');
      }
      setTimeout(() => {
        try {
          process.kill(-pid, 'SIGKILL');
        } catch (_e) {
          try { process.kill(pid, 'SIGKILL'); } catch (_e2) { /* already dead */ }
        }
      }, 1500);
    }
  } catch (_e) {
  }
}

class CancelledError extends Error {
  constructor(message = 'Task cancelled by user') {
    super(message);
    this.name = 'CancelledError';
    this.cancelled = true;
  }
}

function runPythonScript(scriptName, args, onProgress, options = {}) {
  let settled = false;
  let child = null;
  let cancelled = false;

  const promise = new Promise((resolve, reject) => {
    const pythonDir = getPythonPath();
    const scriptPath = path.join(pythonDir, scriptName);

    const python = process.platform === 'win32' ? 'python' : 'python3';
    const cmdArgs = [scriptPath, ...args];

    child = spawn(python, cmdArgs, {
      cwd: pythonDir,
      env: { ...process.env },
      detached: true,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const pid = child.pid;
    let stdoutData = '';
    let stderrData = '';

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    child.stdout.on('data', (data) => {
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

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('close', (code) => {
      if (cancelled) {
        finish(reject, new CancelledError());
        return;
      }

      if (code !== 0) {
        finish(reject, new Error(`Python script exited with code ${code}: ${stderrData}`));
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
          finish(resolve, JSON.parse(lastJsonLine));
        } else {
          finish(resolve, { success: true });
        }
      } catch (e) {
        finish(reject, new Error(`Failed to parse Python output: ${e.message}\nRaw output: ${stdoutData}`));
      }
    });

    child.on('error', (err) => {
      if (cancelled) {
        finish(reject, new CancelledError());
        return;
      }
      finish(reject, new Error(`Failed to start Python: ${err.message}`));
    });

    if (options.signal && typeof options.signal.addEventListener === 'function') {
      options.signal.addEventListener('abort', () => {
        cancelled = true;
        killProcessTree(pid);
      });
    }
  });

  const cancel = () => {
    if (settled || cancelled) return false;
    cancelled = true;
    killProcessTree(child ? child.pid : null);
    return true;
  };

  return {
    promise,
    cancel,
    get pid() { return child ? child.pid : null; },
    get cancelled() { return cancelled; }
  };
}

module.exports = { runPythonScript, getPythonPath, killProcessTree, CancelledError };

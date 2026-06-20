const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');

const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.wma', '.aiff', '.opus'
]);

const WRITE_STABILIZE_MS = 1500;
const MAX_HISTORY = 50;

class FolderWatcher {
  constructor() {
    this.watcher = null;
    this.watchedPath = null;
    this.enabled = false;
    this.autoEnqueue = true;
    this.processed = new Set();
    this.pendingTimers = new Map();
    this.sizeSnapshots = new Map();
    this.history = [];
    this.onNewAudioFile = null;
    this.onStatusChange = null;
    this.stats = {
      watched: false,
      path: null,
      detectedCount: 0,
      autoEnqueue: true
    };
  }

  _emitStatus() {
    this.stats = {
      watched: this.watcher !== null && this.enabled,
      path: this.watchedPath,
      detectedCount: this.processed.size,
      autoEnqueue: this.autoEnqueue,
      recent: this.history.slice(-20).reverse()
    };
    if (this.onStatusChange) {
      this.onStatusChange({ ...this.stats });
    }
  }

  _isAudioFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return AUDIO_EXTENSIONS.has(ext);
  }

  _log(type, filePath, note = '') {
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
      type,
      filePath,
      name: path.basename(filePath),
      time: Date.now(),
      note
    };
    this.history.push(entry);
    if (this.history.length > MAX_HISTORY) {
      this.history.splice(0, this.history.length - MAX_HISTORY);
    }
  }

  async _checkStable(filePath) {
    return new Promise((resolve, reject) => {
      const check = () => {
        try {
          const stat = fs.statSync(filePath);
          const prev = this.sizeSnapshots.get(filePath);
          if (!prev) {
            this.sizeSnapshots.set(filePath, stat.size);
            setTimeout(check, WRITE_STABILIZE_MS);
            return;
          }
          if (prev !== stat.size) {
            this.sizeSnapshots.set(filePath, stat.size);
            setTimeout(check, WRITE_STABILIZE_MS);
            return;
          }
          this.sizeSnapshots.delete(filePath);
          resolve(true);
        } catch (e) {
          this.sizeSnapshots.delete(filePath);
          reject(e);
        }
      };
      check();
    });
  }

  async _tryProcess(filePath) {
    if (!fs.existsSync(filePath)) return;
    if (!this._isAudioFile(filePath)) return;

    const canon = path.resolve(filePath);
    if (this.processed.has(canon)) return;

    if (this.pendingTimers.has(canon)) {
      clearTimeout(this.pendingTimers.get(canon));
    }

    this.pendingTimers.set(canon, setTimeout(async () => {
      this.pendingTimers.delete(canon);

      if (!this.enabled || !this.watcher) return;

      try {
        await this._checkStable(canon);

        if (!this.processed.has(canon)) {
          this.processed.add(canon);
          const fileInfo = {
            id: `watched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: path.basename(canon),
            path: canon,
            size: fs.statSync(canon).size,
            extension: path.extname(canon).toLowerCase(),
            source: 'watch'
          };

          this._log('added', canon, this.autoEnqueue ? '已自动加入队列' : '已检测');

          if (this.autoEnqueue && this.onNewAudioFile) {
            this.onNewAudioFile(fileInfo);
          }

          this._emitStatus();
        }
      } catch (_e) {
        this._log('failed', canon, '文件写入检测失败，已跳过');
        this._emitStatus();
      }
    }, 300));
  }

  start(folderPath, { autoEnqueue = true, scanExisting = false } = {}) {
    this.stop(true);

    if (!folderPath || !fs.existsSync(folderPath)) {
      throw new Error('文件夹路径无效或不存在');
    }

    this.watchedPath = path.resolve(folderPath);
    this.enabled = true;
    this.autoEnqueue = autoEnqueue;

    this.watcher = chokidar.watch(this.watchedPath, {
      ignoreInitial: !scanExisting,
      depth: 99,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 800,
        pollInterval: 200
      },
      ignored: [
        /(^|[\/\\])\../,
        /\.tmp$/,
        /\.crdownload$/,
        /\.part$/,
        '**/node_modules/**'
      ]
    });

    const handler = (filePath) => this._tryProcess(filePath);

    this.watcher.on('add', handler);
    this.watcher.on('addDir', () => {});
    this.watcher.on('change', handler);

    this.watcher.on('ready', () => {
      this._log('system', this.watchedPath, `监视已启动${scanExisting ? '（含扫描现有文件）' : ''}`);
      this._emitStatus();
    });

    this.watcher.on('error', (error) => {
      this._log('error', this.watchedPath || '未知', `监视错误: ${error.message}`);
      this._emitStatus();
    });

    this._emitStatus();
    return this.getStatus();
  }

  stop(resetProcessed = false) {
    for (const timer of this.pendingTimers.values()) {
      clearTimeout(timer);
    }
    this.pendingTimers.clear();
    this.sizeSnapshots.clear();

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    this.enabled = false;
    if (resetProcessed) {
      this.processed.clear();
    }
    this._emitStatus();
  }

  setAutoEnqueue(value) {
    this.autoEnqueue = !!value;
    this._emitStatus();
  }

  rescanExisting() {
    if (!this.watchedPath || !fs.existsSync(this.watchedPath)) return 0;

    let found = 0;
    const scan = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scan(full);
          } else if (entry.isFile() && this._isAudioFile(full)) {
            this._tryProcess(full);
            found++;
          }
        }
      } catch (_e) {
      }
    };
    scan(this.watchedPath);
    return found;
  }

  clearProcessed() {
    this.processed.clear();
    this._emitStatus();
  }

  getStatus() {
    return { ...this.stats };
  }
}

const globalWatcher = new FolderWatcher();

module.exports = {
  FolderWatcher,
  globalWatcher,
  AUDIO_EXTENSIONS
};

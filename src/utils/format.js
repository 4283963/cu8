export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '00:00.000';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${pad(ms, 3)}`;
  }
  return `${pad(minutes)}:${pad(secs)}.${pad(ms, 3)}`;
}

function pad(num, len = 2) {
  return String(num).padStart(len, '0');
}

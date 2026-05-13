const HISTORY_KEY = 'pig_diagnostic_history';

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecord(record) {
  try {
    const history = loadHistory();
    history.unshift(record);
    if (history.length > 50) history.length = 50;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('Lỗi lưu lịch sử:', e);
  }
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

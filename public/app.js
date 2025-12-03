const historyEndpoint = '/api/history';
const collectEndpoint = '/api/collect';

const upCountElement = document.getElementById('upCount');
const downCountElement = document.getElementById('downCount');
const flatCountElement = document.getElementById('flatCount');
const lastUpdatedElement = document.getElementById('lastUpdated');
const refreshButton = document.getElementById('refreshButton');

const mbtiSelect = document.getElementById('mbtiSelect');
const zodiacSelect = document.getElementById('zodiacSelect');
const modeSelect = document.getElementById('modeSelect');
const toneStyleElement = document.getElementById('toneStyle');
const toneDescriptionElement = document.getElementById('toneDescription');

const THEME_PRESETS = {
  fatLoss: {
    primary: '#ff8a3c',
    primaryStrong: '#ff963f',
    accent: '#ffd6a1',
    card: 'rgba(255, 255, 255, 0.94)',
    border: 'rgba(15, 23, 42, 0.08)',
    shadow: 'rgba(15, 23, 42, 0.12)',
    chartUp: '#ff8a3c',
    chartDown: '#3b82f6',
    chartFlat: '#94a3b8'
  },
  muscleGain: {
    primary: '#1f6feb',
    primaryStrong: '#2a7bf3',
    accent: '#c7ddff',
    card: 'rgba(255, 255, 255, 0.94)',
    border: 'rgba(15, 23, 42, 0.1)',
    shadow: 'rgba(5, 30, 75, 0.14)',
    chartUp: '#1f6feb',
    chartDown: '#ff6b6b',
    chartFlat: '#94a3b8'
  },
  officeSurvival: {
    primary: '#7f8ca3',
    primaryStrong: '#9da8c4',
    accent: '#d9def0',
    card: 'rgba(255, 255, 255, 0.93)',
    border: 'rgba(15, 23, 42, 0.08)',
    shadow: 'rgba(15, 16, 35, 0.1)',
    chartUp: '#7f8ca3',
    chartDown: '#9b7bff',
    chartFlat: '#a1aec7'
  }
};

const MBTI_TONE_MAP = {
  INTJ: 'medical',
  ISTJ: 'medical',
  INTP: 'medicalHumor',
  ENTP: 'medicalHumor',
  ENFP: 'friendly',
  ESFP: 'friendly',
  ENFJ: 'friendly',
  ESFJ: 'friendly',
  INFJ: 'healing',
  ISFJ: 'healing',
  INFP: 'healing',
  ISFP: 'healing',
  ENTJ: 'direct',
  ESTJ: 'direct',
  ESTP: 'direct',
  ISTP: 'direct'
};

const ZODIAC_ELEMENT = {
  aries: 'fire',
  leo: 'fire',
  sagittarius: 'fire',
  cancer: 'water',
  scorpio: 'water',
  pisces: 'water',
  taurus: 'earth',
  virgo: 'earth',
  capricorn: 'earth',
  gemini: 'air',
  libra: 'air',
  aquarius: 'air'
};

const ELEMENT_TONE_BIAS = {
  fire: 'direct',
  water: 'healing',
  earth: 'medical',
  air: 'friendly'
};

const TONE_METADATA = {
  medical: { label: '严肃医学型', description: '冷静、专业、数据导向。' },
  medicalHumor: { label: '严肃医学型 + 轻微幽默', description: '逻辑严谨，偶尔抖点冷幽默。' },
  friendly: { label: '朋友陪伴型', description: '温柔、轻松、像朋友一样的提醒。' },
  direct: { label: '直球吐槽型', description: '直接、略带吐槽、富有行动感。' },
  healing: { label: '治愈共情型', description: '细腻、共情、安抚性语言。' }
};

let chart;
let refreshTimer;
let latestStats = [];

function hexToRgba(hex, alpha = 1) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return hex;
  }
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyTheme(mode) {
  const theme = THEME_PRESETS[mode] || THEME_PRESETS.fatLoss;
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.primary);
  root.style.setProperty('--color-primary-strong', theme.primaryStrong);
  root.style.setProperty('--color-accent', theme.accent);
  root.style.setProperty('--color-card', theme.card);
  root.style.setProperty('--color-border', theme.border);
  root.style.setProperty('--color-shadow', theme.shadow);
  root.style.setProperty('--color-chart-up', theme.chartUp);
  root.style.setProperty('--color-chart-down', theme.chartDown);
  root.style.setProperty('--color-chart-flat', theme.chartFlat);

  if (latestStats.length > 0) {
    renderChart(latestStats);
  }
}

function deriveToneStyle(mbti, zodiac) {
  const upperMbti = (mbti || '').toUpperCase();
  const baseToneKey = MBTI_TONE_MAP[upperMbti] || 'friendly';
  const element = ZODIAC_ELEMENT[zodiac] || 'air';
  const biasToneKey = ELEMENT_TONE_BIAS[element];

  const baseMeta = TONE_METADATA[baseToneKey] || TONE_METADATA.friendly;
  const biasMeta = biasToneKey ? TONE_METADATA[biasToneKey] : null;

  let label = baseMeta.label;
  let description = baseMeta.description;

  if (biasMeta && biasToneKey !== baseToneKey) {
    label = `${label} · ${biasMeta.label} 倾向`;
    description = `${description} 同时融合了 ${biasMeta.label} 的表达偏好。`;
  }

  return { label, description };
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return '--';
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  return new Intl.DateTimeFormat('zh-CN', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

function updateLatest(stats) {
  if (!stats || stats.length === 0) {
    upCountElement.textContent = '--';
    downCountElement.textContent = '--';
    flatCountElement.textContent = '--';
    lastUpdatedElement.textContent = '--';
    return;
  }

  const latest = stats[stats.length - 1];
  upCountElement.textContent = latest.up;
  downCountElement.textContent = latest.down;
  flatCountElement.textContent = latest.flat;
  lastUpdatedElement.textContent = formatTimestamp(latest.timestamp);
}

function buildChartData(stats) {
  const styles = getComputedStyle(document.documentElement);
  const upColor = styles.getPropertyValue('--color-chart-up').trim() || 'rgba(75, 192, 192, 1)';
  const downColor = styles.getPropertyValue('--color-chart-down').trim() || 'rgba(255, 99, 132, 1)';
  const flatColor = styles.getPropertyValue('--color-chart-flat').trim() || 'rgba(201, 203, 207, 1)';

  const labels = stats.map((item) => formatTimestamp(item.timestamp));
  const upSeries = stats.map((item) => item.up);
  const downSeries = stats.map((item) => item.down);
  const flatSeries = stats.map((item) => item.flat);

  return {
    labels,
    datasets: [
      {
        label: '上涨',
        data: upSeries,
        borderColor: upColor,
        backgroundColor: hexToRgba(upColor, 0.12),
        tension: 0.3,
        pointRadius: 2,
        fill: false
      },
      {
        label: '下跌',
        data: downSeries,
        borderColor: downColor,
        backgroundColor: hexToRgba(downColor, 0.12),
        tension: 0.3,
        pointRadius: 2,
        fill: false
      },
      {
        label: '持平',
        data: flatSeries,
        borderColor: flatColor,
        backgroundColor: hexToRgba(flatColor, 0.12),
        tension: 0.3,
        pointRadius: 2,
        fill: false
      }
    ]
  };
}

function renderChart(stats) {
  const ctx = document.getElementById('breadthChart').getContext('2d');
  const chartData = buildChartData(stats);
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 12
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '交易对数量'
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom'
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    }
  };

  if (chart) {
    chart.data = chartData;
    chart.options = options;
    chart.update();
  } else {
    chart = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options
    });
  }
}

async function fetchHistory() {
  try {
    const response = await fetch(historyEndpoint, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to fetch history: ${response.status}`);
    }
    const payload = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error('Unexpected response format');
    }
    payload.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return payload;
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function refreshHistory() {
  const stats = await fetchHistory();
  latestStats = stats;
  updateLatest(stats);
  if (stats.length > 0) {
    renderChart(stats);
  }
}

async function triggerManualCollection() {
  refreshButton.disabled = true;
  refreshButton.textContent = '刷新中...';
  try {
    const response = await fetch(collectEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Manual collection failed: ${response.status}`);
    }
  } catch (error) {
    console.error(error);
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = '手动刷新';
    await refreshHistory();
  }
}

function updateToneUI() {
  const { label, description } = deriveToneStyle(mbtiSelect.value, zodiacSelect.value);
  toneStyleElement.textContent = label;
  toneDescriptionElement.textContent = description;
}

function handleModeChange() {
  applyTheme(modeSelect.value);
}

function scheduleAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  refreshTimer = setInterval(() => {
    if (!document.hidden) {
      refreshHistory();
    }
  }, 60 * 1000);
}

refreshButton.addEventListener('click', triggerManualCollection);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    refreshHistory();
  }
});

mbtiSelect.addEventListener('change', updateToneUI);
zodiacSelect.addEventListener('change', updateToneUI);
modeSelect.addEventListener('change', handleModeChange);

handleModeChange();
updateToneUI();
scheduleAutoRefresh();
refreshHistory();

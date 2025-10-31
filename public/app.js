const historyEndpoint = '/api/history';
const collectEndpoint = '/api/collect';

const upCountElement = document.getElementById('upCount');
const downCountElement = document.getElementById('downCount');
const flatCountElement = document.getElementById('flatCount');
const lastUpdatedElement = document.getElementById('lastUpdated');
const refreshButton = document.getElementById('refreshButton');

let chart;
let refreshTimer;

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
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        tension: 0.3,
        pointRadius: 2,
        fill: false
      },
      {
        label: '下跌',
        data: downSeries,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        tension: 0.3,
        pointRadius: 2,
        fill: false
      },
      {
        label: '持平',
        data: flatSeries,
        borderColor: 'rgba(201, 203, 207, 1)',
        backgroundColor: 'rgba(201, 203, 207, 0.1)',
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

scheduleAutoRefresh();
refreshHistory();

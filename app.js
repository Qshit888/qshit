const exchangeSelect = document.querySelector('#exchangeSelect');
const dateInput = document.querySelector('#dateInput');
const refreshBtn = document.querySelector('#refreshBtn');
const lastUpdatedLabel = document.querySelector('#lastUpdated');
const hourlyTableBody = document.querySelector('#hourlyTable tbody');
const chartCanvas = document.querySelector('#hourlyChart');

let chartInstance = null;

const mockDataset = {
  '2024-06-24': {
    binance: generateSampleSeries('2024-06-24T00:00:00+08:00'),
    okx: generateSampleSeries('2024-06-24T00:00:00+08:00', {
      upBase: 30,
      downBase: 27,
      flatChance: 0.2,
    }),
  },
  '2024-06-25': {
    binance: generateSampleSeries('2024-06-25T00:00:00+08:00', {
      upBase: 38,
      downBase: 18,
      flatChance: 0.05,
    }),
    okx: generateSampleSeries('2024-06-25T00:00:00+08:00', {
      upBase: 33,
      downBase: 23,
      flatChance: 0.15,
    }),
  },
};

function generateSampleSeries(startISO, options = {}) {
  const hours = 24;
  const startTime = new Date(startISO);
  const {
    upBase = 35,
    downBase = 20,
    flatChance = 0.1,
  } = options;

  return Array.from({ length: hours }, (_, idx) => {
    const timestamp = new Date(startTime.getTime() + idx * 60 * 60 * 1000);
    const up = Math.max(0, Math.round(randomAround(upBase, 10)));
    const down = Math.max(0, Math.round(randomAround(downBase, 8)));
    const flat = Math.random() < flatChance ? Math.round(Math.random() * 8) : 0;
    return {
      hour: timestamp.toISOString(),
      up,
      down,
      flat,
    };
  });
}

function randomAround(base, variance) {
  return base + (Math.random() - 0.5) * variance * 2;
}

function formatHourLabel(iso) {
  const date = new Date(iso);
  return `${date.getHours().toString().padStart(2, '0')}:00`;
}

function updateExchangeOptions(dateKey) {
  const exchanges = Object.keys(mockDataset[dateKey] || {});
  exchangeSelect.innerHTML = '';
  exchanges.forEach((exchange) => {
    const option = document.createElement('option');
    option.value = exchange;
    option.textContent = exchange.toUpperCase();
    exchangeSelect.appendChild(option);
  });
  if (exchangeSelect.options.length > 0) {
    exchangeSelect.value = exchangeSelect.options[0].value;
  } else {
    exchangeSelect.value = '';
  }
}

function getSelectedSeries() {
  const dateKey = dateInput.value;
  const exchangeKey = exchangeSelect.value;
  return mockDataset?.[dateKey]?.[exchangeKey] ?? [];
}

function updateLastUpdated(dateKey) {
  const latest = new Date();
  if (mockDataset[dateKey]) {
    lastUpdatedLabel.textContent = `最后更新：${latest
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ')}`;
  } else {
    lastUpdatedLabel.textContent = '暂无数据';
  }
}

function renderTable(series) {
  hourlyTableBody.innerHTML = '';
  series.forEach((item) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatHourLabel(item.hour)}</td>
      <td><span class="badge badge--up">${item.up}</span></td>
      <td><span class="badge badge--down">${item.down}</span></td>
      <td><span class="badge badge--flat">${item.flat}</span></td>
    `;
    hourlyTableBody.appendChild(row);
  });
}

function renderChart(series) {
  const labels = series.map((item) => formatHourLabel(item.hour));
  const upData = series.map((item) => item.up);
  const downData = series.map((item) => item.down);
  const flatData = series.map((item) => item.flat);

  const data = {
    labels,
    datasets: [
      {
        label: '上涨',
        data: upData,
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.15)',
        tension: 0.3,
        fill: true,
      },
      {
        label: '下跌',
        data: downData,
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.12)',
        tension: 0.3,
        fill: true,
      },
      {
        label: '持平',
        data: flatData,
        borderColor: '#6b7280',
        backgroundColor: 'rgba(107, 114, 128, 0.12)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const config = {
    type: 'line',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 0,
      animation: {
        duration: 300,
        easing: 'easeOutCubic',
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            title: (context) => `时间：${context[0].label}`,
          },
        },
      },
    },
  };

  if (chartInstance) {
    chartInstance.destroy();
  }
  chartInstance = new Chart(chartCanvas, config);
  chartInstance.resize();
}

function refreshView() {
  const dateKey = dateInput.value;
  const series = getSelectedSeries();
  renderTable(series);
  renderChart(series);
  updateLastUpdated(dateKey);
}

refreshBtn.addEventListener('click', refreshView);
exchangeSelect.addEventListener('change', () => {
  const series = getSelectedSeries();
  renderTable(series);
  renderChart(series);
});

dateInput.addEventListener('change', () => {
  updateExchangeOptions(dateInput.value);
  refreshView();
});

function init() {
  const defaultDate = Object.keys(mockDataset)[0];
  dateInput.value = defaultDate;
  updateExchangeOptions(defaultDate);
  refreshView();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 如需接入真实接口，可参考以下示例：
// async function fetchHourlySummary(exchange, date) {
//   const url = `/api/stats/hourly?exchange=${exchange}&date=${date}`;
//   const response = await fetch(url);
//   if (!response.ok) {
//     throw new Error('无法获取数据');
//   }
//   return response.json();
// }
// 并在 refreshView 中调用 fetchHourlySummary 以替换 mock 数据。

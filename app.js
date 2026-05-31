// ═══════════════════════════════════════════════════════════════
//  app.js  —  Plant Growth Anomaly Detector
// ═══════════════════════════════════════════════════════════════
 
// ─── State ──────────────────────────────────────────────────────
let parsedCSV   = null;   // raw parsed rows from CSV
let lastResults = null;   // last JSON from detect.php
let filterMode  = 'all';  // 'all' | 'anomalies' | 'normal'
 
// Plant color palette (one per plant_id)
const PLANT_COLORS = [
  '#2d6a4f','#52b788','#1b4332','#74c69d',
  '#40916c','#95d5b2','#081c15','#b7e4c7'
];
 
// ─── DOM refs ───────────────────────────────────────────────────
const fileInput      = document.getElementById('csv-file');
const pasteArea      = document.getElementById('paste-data');
const thresholdRange = document.getElementById('threshold-range');
const thresholdVal   = document.getElementById('threshold-val');
const runBtn         = document.getElementById('run-btn');
const sampleBtn      = document.getElementById('sample-btn');
const loadingEl      = document.getElementById('loading');
const alertEl        = document.getElementById('error-alert');
const resultsSection = document.getElementById('results-section');
const placeholder    = document.getElementById('chart-placeholder');
const tooltip        = document.getElementById('tooltip');
 
// ─── Threshold slider live update ───────────────────────────────
thresholdRange.addEventListener('input', () => {
  thresholdVal.textContent = parseFloat(thresholdRange.value).toFixed(1);
});
 
// ─── Drag-and-drop on upload zone ───────────────────────────────
const uploadZone = document.querySelector('.upload-zone');
['dragover','dragenter'].forEach(e =>
  uploadZone.addEventListener(e, ev => { ev.preventDefault(); uploadZone.classList.add('dragover'); })
);
['dragleave','drop'].forEach(e =>
  uploadZone.addEventListener(e, ev => {
    ev.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e === 'drop' && ev.dataTransfer.files.length) {
      fileInput.files = ev.dataTransfer.files;
      handleFileRead(ev.dataTransfer.files[0]);
    }
  })
);
 
fileInput.addEventListener('change', () => {
  if (fileInput.files.length) handleFileRead(fileInput.files[0]);
});
 
// ─── Read file into pasteArea ────────────────────────────────────
function handleFileRead(file) {
  const reader = new FileReader();
  reader.onload = e => {
    pasteArea.value = e.target.result;
    showAlert('');
  };
  reader.readAsText(file);
}
 
// ─── Load sample CSV (hardcoded — no file fetch needed) ──────────
const SAMPLE_CSV = `plant_id,plant_name,week,height_cm
1,Mung Bean A,1,2.1
1,Mung Bean A,2,4.3
1,Mung Bean A,3,11.8
1,Mung Bean A,4,3.0
1,Mung Bean A,5,8.5
1,Mung Bean A,6,10.2
2,Mung Bean B,1,1.9
2,Mung Bean B,2,4.1
2,Mung Bean B,3,0.0
2,Mung Bean B,4,0.0
2,Mung Bean B,5,6.3
2,Mung Bean B,6,8.8
3,Mung Bean C,1,2.5
3,Mung Bean C,2,4.8
3,Mung Bean C,3,7.1
3,Mung Bean C,4,7.1
3,Mung Bean C,5,7.1
3,Mung Bean C,6,9.4
4,Sunflower A,1,3.2
4,Sunflower A,2,6.8
4,Sunflower A,3,10.5
4,Sunflower A,4,8.1
4,Sunflower A,5,14.2
4,Sunflower A,6,18.6
5,Sunflower B,1,4.0
5,Sunflower B,2,7.5
5,Sunflower B,3,19.0
5,Sunflower B,4,14.0
5,Sunflower B,5,16.8
5,Sunflower B,6,20.1
6,Pechay A,1,1.2
6,Pechay A,2,2.8
6,Pechay A,3,4.5
6,Pechay A,4,4.5
6,Pechay A,5,4.5
6,Pechay A,6,7.2`;
 
sampleBtn.addEventListener('click', () => {
  pasteArea.value = SAMPLE_CSV;
  showAlert('');
});
 
// ─── Parse CSV text → array of objects ──────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const required = ['plant_id','plant_name','week','height_cm'];
  required.forEach(r => {
    if (!headers.includes(r)) throw new Error(`Missing required column: "${r}"`);
  });
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const obj  = {};
    headers.forEach((h, i) => obj[h] = vals[i]?.trim() ?? '');
    return obj;
  });
}
 
// ─── Run Detection ───────────────────────────────────────────────
runBtn.addEventListener('click', runDetection);
 
async function runDetection() {
  showAlert('');
  const rawText = pasteArea.value.trim();
  if (!rawText) { showAlert('Please upload a CSV file or paste data first.'); return; }
 
  try {
    parsedCSV = parseCSV(rawText);
  } catch (err) {
    showAlert(err.message);
    return;
  }
 
  setLoading(true);
  const formData = new FormData();
  formData.append('data',      JSON.stringify(parsedCSV));
  formData.append('threshold', thresholdRange.value);
 
  let json;
  try {
    const res = await fetch('detect.php', { method: 'POST', body: formData });
    json = await res.json();
  } catch (err) {
    showAlert('Failed to reach detect.php. Make sure your PHP server is running. (' + err.message + ')');
    setLoading(false);
    return;
  }
 
  setLoading(false);
 
  if (json.error) { showAlert(json.error); return; }
 
  try {
    lastResults = json;
    renderAll(json);
  } catch (err) {
    showAlert('Rendering error: ' + err.message);
    console.error('Render error:', err);
  }
}
 
// ─── Re-run when slider released ────────────────────────────────
thresholdRange.addEventListener('change', () => {
  if (parsedCSV) runDetection();
});
 
// ─── Render everything ───────────────────────────────────────────
function renderAll(data) {
  updateStats(data);
  renderChart(data.results);
  renderTable(data.results);
  resultsSection.style.display = 'block';
  if (placeholder) placeholder.style.display = 'none';
  renderChart(data.results);
  renderTable(data.results);
}
 
// ─── Stats Cards ─────────────────────────────────────────────────
function updateStats(data) {
  document.getElementById('stat-total').textContent     = data.total_points;
  document.getElementById('stat-anomalies').textContent = data.anomaly_count;
  document.getElementById('stat-mean').textContent      = data.mean.toFixed(2) + ' cm';
  document.getElementById('stat-threshold').textContent = '±' + data.threshold;
}
 
// ─── D3.js Line + Scatter Chart ──────────────────────────────────
function renderChart(results) {
  d3.select('#chart').selectAll('*').remove();
 
  const container = document.getElementById('chart-container');
  const W = (container.clientWidth || container.parentElement.clientWidth || 800) - 32;
  const H  = 360;
  const mg = { top: 30, right: 30, bottom: 50, left: 55 };
  const iW = W  - mg.left - mg.right;
  const iH = H  - mg.top  - mg.bottom;
 
  // Group by plant
  const byPlant = d3.group(results, d => d.plant_id);
  const plants  = Array.from(byPlant.keys());
 
  const colorMap = {};
  plants.forEach((pid, i) => colorMap[pid] = PLANT_COLORS[i % PLANT_COLORS.length]);
 
  const allWeeks   = results.map(d => d.week);
  const allHeights = results.map(d => d.height_cm);
 
  const xScale = d3.scaleLinear()
    .domain([d3.min(allWeeks), d3.max(allWeeks)])
    .range([0, iW]);
 
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(allHeights) * 1.15])
    .range([iH, 0]);
 
  const svg = d3.select('#chart')
    .attr('width',  W)
    .attr('height', H);
 
  const g = svg.append('g')
    .attr('transform', `translate(${mg.left},${mg.top})`);
 
  // Gridlines
  g.append('g').attr('class', 'grid')
    .attr('transform', `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).tickSize(-iH).tickFormat(''));
 
  g.append('g').attr('class', 'grid')
    .call(d3.axisLeft(yScale).tickSize(-iW).tickFormat(''));
 
  // Axes
  g.append('g').attr('class', 'axis')
    .attr('transform', `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).ticks(d3.max(allWeeks)).tickFormat(d => 'Wk ' + d));
 
  g.append('g').attr('class', 'axis')
    .call(d3.axisLeft(yScale).ticks(6).tickFormat(d => d + ' cm'));
 
  // Axis labels
  g.append('text')
    .attr('x', iW / 2).attr('y', iH + 42)
    .attr('text-anchor', 'middle')
    .style('font-size', '11px').style('fill', '#5a7a65')
    .text('Week');
 
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -iH / 2).attr('y', -44)
    .attr('text-anchor', 'middle')
    .style('font-size', '11px').style('fill', '#5a7a65')
    .text('Height (cm)');
 
  // Lines per plant
  const lineGen = d3.line()
    .x(d => xScale(d.week))
    .y(d => yScale(d.height_cm))
    .curve(d3.curveMonotoneX);
 
  byPlant.forEach((rows, pid) => {
    const sorted = [...rows].sort((a, b) => a.week - b.week);
    g.append('path')
      .datum(sorted)
      .attr('class', 'plant-line')
      .attr('stroke', colorMap[pid])
      .attr('d', lineGen);
  });
 
  // Dots (normal first, anomalies on top)
  const normalPts = results.filter(d => !d.anomaly);
  const anomPts   = results.filter(d => d.anomaly);
 
  function drawDots(pts, cls, r) {
    g.selectAll(null).data(pts).enter()
      .append('circle')
      .attr('class', cls)
      .attr('cx', d => xScale(d.week))
      .attr('cy', d => yScale(d.height_cm))
      .attr('r', r)
      .on('mousemove', (event, d) => showTooltip(event, d))
      .on('mouseleave', hideTooltip);
  }
 
  drawDots(normalPts, 'dot-normal',  5);
  drawDots(anomPts,   'dot-anomaly', 7);
 
  // Legend
  const legendEl = document.getElementById('chart-legend');
  legendEl.innerHTML = '';
 
  // Plant lines legend
  plants.forEach(pid => {
    const name = byPlant.get(pid)[0].plant_name;
    legendEl.innerHTML += `
      <span class="legend-item">
        <span class="legend-line" style="background:${colorMap[pid]}"></span>
        ${name}
      </span>`;
  });
 
  // Anomaly/normal dot legend
  legendEl.innerHTML += `
    <span class="legend-item">
      <span class="legend-dot" style="background:#52b788;border:2px solid #2d6a4f"></span>
      Normal
    </span>
    <span class="legend-item">
      <span class="legend-dot" style="background:#d62828;border:2px solid #8b0000"></span>
      Anomaly
    </span>`;
}
 
// ─── Tooltip ─────────────────────────────────────────────────────
function showTooltip(event, d) {
  const reasonsHtml = d.anomaly && d.reasons.length
    ? `<div class="tt-anom">⚠ ${d.reasons.join('<br>⚠ ')}</div>`
    : '';
  tooltip.innerHTML = `
    <div class="tt-title">🌱 ${d.plant_name}</div>
    Week ${d.week} — <strong>${d.height_cm} cm</strong><br>
    Z-score: ${d.z_score}
    ${reasonsHtml}
  `;
  tooltip.classList.add('visible');
  positionTooltip(event);
}
 
function hideTooltip() { tooltip.classList.remove('visible'); }
 
document.addEventListener('mousemove', e => {
  if (tooltip.classList.contains('visible')) positionTooltip(e);
});
 
function positionTooltip(e) {
  const pad = 14;
  let x = e.clientX + pad;
  let y = e.clientY - pad;
  const tw = tooltip.offsetWidth  || 180;
  const th = tooltip.offsetHeight || 80;
  if (x + tw > window.innerWidth)  x = e.clientX - tw - pad;
  if (y + th > window.innerHeight) y = e.clientY - th - pad;
  tooltip.style.left = x + 'px';
  tooltip.style.top  = y + 'px';
}
 
// ─── Results Table ───────────────────────────────────────────────
function renderTable(results) {
  const tbody = document.getElementById('result-tbody');
  tbody.innerHTML = '';
 
  const filtered = results.filter(d => {
    if (filterMode === 'anomalies') return d.anomaly;
    if (filterMode === 'normal')    return !d.anomaly;
    return true;
  });
 
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3" style="color:var(--text-muted)">No records match the current filter.</td></tr>`;
    return;
  }
 
  filtered.forEach(d => {
    const row = document.createElement('tr');
    if (d.anomaly) row.style.background = 'rgba(214,40,40,0.04)';
    const reasonText = d.reasons.length ? d.reasons.join('; ') : '—';
    row.innerHTML = `
      <td><strong>${d.plant_name}</strong></td>
      <td>${d.week}</td>
      <td>${d.height_cm}</td>
      <td>${d.z_score}</td>
      <td>${d.anomaly
        ? `<span class="badge-anom">⚠ Anomaly</span>`
        : `<span class="badge-ok">✓ Normal</span>`}
      </td>
      <td style="font-size:0.8rem;color:var(--text-muted)">${reasonText}</td>
    `;
    tbody.appendChild(row);
  });
}
 
// ─── Filter buttons ──────────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.remove('active','active-danger');
    });
    filterMode = btn.dataset.filter;
    if (filterMode === 'anomalies') btn.classList.add('active-danger');
    else                            btn.classList.add('active');
    if (lastResults) renderTable(lastResults.results);
  });
});
 
// Initialize first filter button as active
document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
 
// ─── Utilities ───────────────────────────────────────────────────
function setLoading(state) {
  loadingEl.style.display = state ? 'block' : 'none';
  runBtn.disabled         = state;
  runBtn.innerHTML        = state
    ? '<span class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px"></span>Analyzing...'
    : '🔍 Run Detection';
}
 
function showAlert(msg) {
  alertEl.textContent    = msg;
  alertEl.style.display  = msg ? 'block' : 'none';
}
 
// ─── Responsive chart resize ─────────────────────────────────────
window.addEventListener('resize', () => {
  if (lastResults) renderChart(lastResults.results);
});
 
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SproutWatch — Growth Anomaly Detector</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <link rel="stylesheet" href="style.css">
</head>
<body>

<!-- ══════════════════════════════════════════ -->
<!--  HEADER                                    -->
<!-- ══════════════════════════════════════════ -->
<header class="site-header">
  <div class="container-fluid px-4">
    <div class="d-flex align-items-center gap-2">
      <span class="header-icon">🌱</span>
      <div>
        <div class="header-title">SproutWatch</div>
        <div class="header-sub">Plant Growth Anomaly Detector</div>
      </div>
    </div>
  </div>
</header>

<!-- ══════════════════════════════════════════ -->
<!--  MAIN                                      -->
<!-- ══════════════════════════════════════════ -->
<main class="container-fluid px-4 py-4">

  <!-- TOP ROW: Data Input (left) + Right Cards -->
  <div class="row g-3 mb-3">

    <!-- Left: Data Input (tall card) -->
    <div class="col-md-6">
      <div class="card h-100">
        <div class="card-head">📂 Data Input</div>
        <div class="card-body-inner">

          <label class="field-label">Upload CSV File</label>
          <div class="upload-zone-wrap mb-3">
            <div class="upload-zone" id="upload-zone">
              <div class="upload-icon">🌿</div>
              <p>Drag &amp; drop your CSV here<br><small>or click to browse</small></p>
              <input type="file" id="csv-file" accept=".csv,.txt">
            </div>
          </div>

          <label class="field-label">Or Paste CSV Data</label>
          <textarea id="paste-data" class="field-textarea" rows="8"
            placeholder="plant_id,plant_name,week,height_cm&#10;1,Mung Bean A,1,2.1&#10;1,Mung Bean A,2,4.3&#10;..."></textarea>

          <p class="hint-text mt-2">
            Required columns: <code>plant_id</code>, <code>plant_name</code>,
            <code>week</code>, <code>height_cm</code>
          </p>
          <button class="btn-sample mt-2" id="sample-btn">📄 Load Sample Data</button>

        </div>
      </div>
    </div>

    <!-- Right: Detection Parameters + Anomaly Rules stacked -->
    <div class="col-md-6 d-flex flex-column gap-3">

      <div class="card">
        <div class="card-head">⚙️ Detection Parameters</div>
        <div class="card-body-inner">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <label class="field-label mb-0">Z-Score Threshold</label>
            <span class="threshold-badge" id="threshold-val">2.0</span>
          </div>
          <input type="range" id="threshold-range"
            min="1.0" max="4.0" step="0.1" value="2.0" class="w-100 mb-2">
          <p class="hint-text">
            Lower = more sensitive. Values with |z| ≥ threshold are flagged.
          </p>
        </div>
      </div>

      <div class="card">
        <div class="card-head">🚨 Anomaly Rules</div>
        <div class="card-body-inner">
          <ul class="rules-list">
            <li>Z-score ≥ threshold <span class="rule-tag">Statistical</span></li>
            <li>Height = 0 cm <span class="rule-tag">Dead / Wilted</span></li>
            <li>Height decreased from previous week <span class="rule-tag">Drop</span></li>
            <li>Growth ≥ 2.5× previous week <span class="rule-tag">Spike</span></li>
            <li>Same height for 3+ consecutive weeks <span class="rule-tag">Stagnant</span></li>
          </ul>
        </div>
      </div>

    </div>
  </div>

  <!-- RUN DETECTION BUTTON (centered, below both columns) -->
  <div class="row mb-4">
    <div class="col-12 text-center">
      <button class="btn-run" id="run-btn">🔍 Run Detection</button>
      <div class="alert-custom mt-3" id="error-alert"></div>
    </div>
  </div>

  <!-- LOADING SPINNER -->
  <div id="loading">
    <div class="spinner"></div>
    <p>Analyzing your plant data…</p>
  </div>

  <!-- RESULTS SECTION (hidden until detection runs) -->
  <div id="results-section">

    <!-- 4 Stat Cards -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3">
        <div class="stat-card">
          <div class="stat-number" id="stat-total">—</div>
          <div class="stat-label">Total Points</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="stat-card">
          <div class="stat-number pink" id="stat-anomalies">—</div>
          <div class="stat-label">Anomalies</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="stat-card">
          <div class="stat-number" id="stat-mean">—</div>
          <div class="stat-label">Mean Height</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="stat-card">
          <div class="stat-number" id="stat-threshold">—</div>
          <div class="stat-label">Z-Threshold</div>
        </div>
      </div>
    </div>

    <!-- Line Chart -->
    <div class="card mb-4">
      <div class="card-head">📈 Growth Chart</div>
      <div class="card-body-inner">
        <div id="chart-container">
          <svg id="chart"></svg>
        </div>
        <div class="chart-legend mt-3" id="chart-legend"></div>
      </div>
    </div>

    <!-- Results Table -->
    <div class="card mb-4">
      <div class="card-head">📋 Detection Results</div>
      <div class="card-body-inner">
        <div class="filter-bar mb-3">
          <span class="filter-label">Filter:</span>
          <button class="filter-btn active" data-filter="all">All</button>
          <button class="filter-btn" data-filter="anomalies">⚠ Anomalies Only</button>
          <button class="filter-btn" data-filter="normal">✓ Normal Only</button>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Plant</th>
                <th>Week</th>
                <th>Height (cm)</th>
                <th>Z-Score</th>
                <th>Status</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody id="result-tbody">
              <tr>
                <td colspan="6" class="text-center py-3 muted">Run detection to see results.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </div><!-- /results-section -->
</main>

<!-- Tooltip -->
<div id="tooltip"></div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script src="app.js"></script>
</body>
</html>
# SproutWatch: Plant Growth Anomaly Detection System

A lightweight PHP + JavaScript web application that detects abnormal growth patterns in plant height data using statistical analysis and rule-based anomaly detection.

---

## Features

- Upload a CSV of weekly plant height measurements
- Detects 5 types of anomalies: statistical outliers, dead/wilted plants, sudden drops, sudden spikes, and stagnant growth
- Interactive **D3.js chart** with hover tooltips showing plant name, height, Z-score, and anomaly reasons
- Adjustable **Z-score threshold slider** for sensitivity control
- Filter results by All / Anomalies Only / Normal Only
- Reason-tagged results table explaining why each point was flagged
- No database required, runs locally on XAMPP

---

## Anomaly Detection Methods

### 1. Global Z-Score (Statistical Outlier Detection)
```
Z-score = (height - global_mean) / global_std_dev
Flagged when |Z| >= threshold (default: 2.0, adjustable 1.0 - 4.0)
```

### 2. Dead / Wilted Rule
```
height <= 0 → flagged
```

### 3. Sudden Drop Rule
```
height[week] < height[week-1] AND height > 0 → flagged
```

### 4. Sudden Spike Rule
```
height[week] >= height[week-1] * 2.5 → flagged
```

### 5. Stagnant Growth Rule
```
height[i-2] == height[i-1] == height[i] for 3+ consecutive weeks → flagged
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | PHP 8.x (anomaly detection logic) |
| Frontend | HTML5, Bootstrap 5 |
| Visualization | D3.js v7 |
| Scripting | Vanilla JavaScript |
| Styling | CSS3, Google Fonts |

---

## How to Run

### Requirements
- XAMPP (PHP 8.0+, Apache)
- Any modern browser

### Steps

**1. Place files in XAMPP htdocs**
```
C:\xampp\htdocs\sproutwatch\
```

**2. Start Apache in XAMPP Control Panel**

**3. Open in browser**
```
http://localhost/sproutwatch/index.php
```

**4. Run detection**
- Click **Load Sample Data** to use the included dataset, or upload your own CSV
- Adjust the Z-score threshold if needed
- Click **Run Detection**

---

## CSV Format

```csv
plant_id,plant_name,week,height_cm
1,Mung Bean A,1,2.5
1,Mung Bean A,2,4.1
...
```

---

## File Structure

```
sproutwatch/
├── index.php           # Main UI
├── detect.php          # Anomaly detection logic
├── app.js              # CSV parsing, D3.js chart, table rendering
├── style.css           # Custom styles
├── sample_plants.csv   # Sample dataset (6 plants, 6 weeks)
└── README.md           # This file
```

---

## Academic Context

Built for **DSELC03C - CS301**
Lyceum of the Philippines University Cavite | April 2026

---

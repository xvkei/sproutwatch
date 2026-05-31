<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// ─── Parse incoming data ───────────────────────────────────────────────────
$rawData   = isset($_POST['data'])      ? json_decode($_POST['data'], true) : [];
$threshold = isset($_POST['threshold']) ? floatval($_POST['threshold'])     : 2.0;

if (empty($rawData) || !is_array($rawData)) {
    echo json_encode(['error' => 'No data received or invalid format.']);
    exit;
}

// ─── Group rows by plant_id ────────────────────────────────────────────────
$plants = [];
foreach ($rawData as $row) {
    $id = $row['plant_id'];
    if (!isset($plants[$id])) {
        $plants[$id] = [
            'plant_name' => $row['plant_name'],
            'rows'       => []
        ];
    }
    $plants[$id]['rows'][] = [
        'week'      => intval($row['week']),
        'height_cm' => floatval($row['height_cm'])
    ];
}

// ─── Sort each plant's rows by week ───────────────────────────────────────
foreach ($plants as &$plant) {
    usort($plant['rows'], fn($a, $b) => $a['week'] - $b['week']);
}
unset($plant);

// ─── Compute global Z-score stats on all height values ────────────────────
$allHeights = array_column(array_merge(...array_column(
    array_map(fn($p) => $p['rows'], $plants), null
)), 'height_cm');

$globalMean = array_sum($allHeights) / count($allHeights);
$globalVariance = array_sum(array_map(
    fn($x) => ($x - $globalMean) ** 2, $allHeights
)) / count($allHeights);
$globalStd = sqrt($globalVariance);

// ─── Anomaly detection per plant ──────────────────────────────────────────
$results = [];

foreach ($plants as $plantId => $plant) {
    $rows       = $plant['rows'];
    $plantName  = $plant['plant_name'];
    $n          = count($rows);

    // Detect stagnant stretches (same height 3+ consecutive weeks)
    // Build a map of index => stagnant flag first
    $stagnantFlags = array_fill(0, $n, false);
    for ($i = 2; $i < $n; $i++) {
        $h0 = $rows[$i - 2]['height_cm'];
        $h1 = $rows[$i - 1]['height_cm'];
        $h2 = $rows[$i]['height_cm'];
        if ($h0 == $h1 && $h1 == $h2) {
            $stagnantFlags[$i - 2] = true;
            $stagnantFlags[$i - 1] = true;
            $stagnantFlags[$i]     = true;
        }
    }

    foreach ($rows as $idx => $row) {
        $h       = $row['height_cm'];
        $week    = $row['week'];
        $reasons = [];
        $isAnom  = false;

        // 1. Z-score check (global)
        $z = ($globalStd > 0) ? ($h - $globalMean) / $globalStd : 0;
        if (abs($z) >= $threshold) {
            $isAnom    = true;
            $reasons[] = 'Z-score outlier (z=' . round($z, 2) . ')';
        }

        // 2. Dead / Wilted
        if ($h <= 0) {
            $isAnom    = true;
            $reasons[] = 'Height is 0 — plant may be dead or wilted';
        }

        // 3. Sudden drop (negative growth vs previous week)
        if ($idx > 0 && $h < $rows[$idx - 1]['height_cm'] && $h > 0) {
            $isAnom    = true;
            $reasons[] = 'Sudden drop from week ' . $rows[$idx - 1]['week'];
        }

        // 4. Sudden spike (growth > 2× previous height)
        if ($idx > 0) {
            $prev = $rows[$idx - 1]['height_cm'];
            if ($prev > 0 && $h >= $prev * 2.5) {
                $isAnom    = true;
                $reasons[] = 'Sudden spike (grew ' . round(($h / $prev), 1) . '× from prev week)';
            }
        }

        // 5. Stagnant growth (3+ same values)
        if ($stagnantFlags[$idx]) {
            $isAnom    = true;
            $reasons[] = 'Stagnant — no growth for 3+ consecutive weeks';
        }

        $results[] = [
            'plant_id'   => $plantId,
            'plant_name' => $plantName,
            'week'       => $week,
            'height_cm'  => $h,
            'z_score'    => round($z, 4),
            'anomaly'    => $isAnom,
            'reasons'    => $reasons
        ];
    }
}

// ─── Summary stats ────────────────────────────────────────────────────────
$anomalyCount = count(array_filter($results, fn($r) => $r['anomaly']));

echo json_encode([
    'mean'          => round($globalMean, 4),
    'std'           => round($globalStd, 4),
    'threshold'     => $threshold,
    'anomaly_count' => $anomalyCount,
    'total_points'  => count($results),
    'results'       => $results
]);

interface LaserScan {
  angle_min: number;
  angle_max: number;
  angle_increment: number;
  range_min: number;
  range_max: number;
  ranges: number[];
}

function parseLidarScan(msg: LaserScan): string {
  const { ranges, angle_min, angle_increment, range_min, range_max } = msg;
  const n = ranges.length;
  const OBSTACLE_THRESH = 2.0;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const isValid = (r: number) => isFinite(r) && r >= range_min;

  function sectorStats(degMin: number, degMax: number): [number | null, number | null] {
    const i0 = Math.max(0, Math.round((toRad(degMin) - angle_min) / angle_increment));
    const i1 = Math.min(n - 1, Math.round((toRad(degMax) - angle_min) / angle_increment));
    const valid = ranges.slice(i0, i1 + 1).filter(isValid);
    if (valid.length === 0) return [null, null];
    const min = Math.min(...valid);
    const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
    return [min, mean];
  }

  // Normalize angle to [-180, 180]
  const normalizeAngle = (deg: number) => {
    let a = ((deg % 360) + 360) % 360;
    if (a > 180) a -= 360;
    return a;
  };

  function findClusters(thresh = 6.0) {
    const clusters: { dist: number; angle: number; approxWidth: number }[] = [];
    let indices: number[] = [];

    const flush = () => {
      if (indices.length >= 3) {
        const dists = indices.map(i => ranges[i]);
        const minDist = Math.min(...dists);
        const centerI = indices[dists.indexOf(minDist)];
        const angleDeg = normalizeAngle(toDeg(angle_min + centerI * angle_increment));
        const approxWidth = parseFloat((minDist * indices.length * angle_increment).toFixed(2));
        clusters.push({
          dist: parseFloat(minDist.toFixed(2)),
          angle: parseFloat(angleDeg.toFixed(1)),
          approxWidth,
        });
      }
      indices = [];
    };

    // Split clusters by jump in consecutive range values (euclidean gap between adjacent rays).
    // This correctly separates distinct objects even when both are within thresh.
    const JUMP_THRESH = 0.5; // meters — gap between two adjacent rays to consider a new object

    for (let i = 0; i < n; i++) {
      const r = ranges[i];
      if (!isValid(r) || r > thresh) {
        flush();
        continue;
      }
      if (indices.length > 0) {
        const prev = ranges[indices[indices.length - 1]];
        if (Math.abs(r - prev) > JUMP_THRESH) {
          flush();
        }
      }
      indices.push(i);
    }
    flush();

    // Merge wrap-around split: first and last cluster may be the same object
    // split at the scan boundary (index 0 / index N-1).
    if (clusters.length >= 2) {
      const first = clusters[0];
      const last = clusters[clusters.length - 1];
      const absDiff = Math.abs(first.angle - last.angle);
      // Minimum circular angular distance between the two cluster centers
      const circularDiff = Math.min(absDiff, 360 - absDiff);
      const distRatio = Math.max(first.dist, last.dist) / Math.min(first.dist, last.dist);
      if (circularDiff <= 10 && distRatio < 1.2) {
        // Pick the angle of the closer cluster; merge widths
        const merged = {
          dist: Math.min(first.dist, last.dist),
          angle: first.dist <= last.dist ? first.angle : last.angle,
          approxWidth: parseFloat((first.approxWidth + last.approxWidth).toFixed(2)),
        };
        clusters.splice(clusters.length - 1, 1);
        clusters.splice(0, 1, merged);
      }
    }

    return clusters;
  }

  // ROS angle convention: 0°=front, positive=left (CCW), negative=right (CW)
  const sectors: Record<string, [number, number]> = {
    Front: [-45, 45],
    Left: [45, 135],
    Rear: [135, 225],
    Right: [225, 315],
  };

  const sectorRange: Record<string, string> = {
    Front: `${sectors.Front[0]}°..${sectors.Front[1]}°`,
    Left: `${sectors.Left[0]}°..${sectors.Left[1]}°`,
    Rear: `${sectors.Rear[0]}°..${sectors.Rear[1]}°`,
    Right: `${sectors.Right[0]}°..${sectors.Right[1]}°`,
  };

  function sectorDetails(degMin: number, degMax: number) {
    const i0 = Math.max(0, Math.round((toRad(degMin) - angle_min) / angle_increment));
    const i1 = Math.min(n - 1, Math.round((toRad(degMax) - angle_min) / angle_increment));
    const validIndices = ranges.slice(i0, i1 + 1).reduce<number[]>((acc, r, j) => {
      if (isValid(r)) acc.push(i0 + j);
      return acc;
    }, []);
    if (validIndices.length === 0)
      return { min: null as number | null, mean: null as number | null, bearings: [] as number[] };
    const dists = validIndices.map(i => ranges[i]);
    const min = Math.min(...dists);
    const mean = dists.reduce((a, b) => a + b, 0) / dists.length;
    const bearings = validIndices
      .filter(i => ranges[i] < OBSTACLE_THRESH)
      .map(i => parseFloat(toDeg(angle_min + i * angle_increment).toFixed(1)));
    return { min, mean, bearings };
  }

  const lines: string[] = [];
  lines.push(`LIDAR scan — robot-frame (0°=forward, CCW positive), range ${range_max.toFixed(0)}m`);
  lines.push('');

  for (const [label, [dMin, dMax]] of Object.entries(sectors)) {
    const { min, mean, bearings } = sectorDetails(dMin, dMax);
    const rangeStr = sectorRange[label];
    if (min === null) {
      lines.push(`  ${label.padEnd(5)} [${rangeStr}]: open (>${range_max.toFixed(0)}m)`);
    } else if (min < OBSTACLE_THRESH) {
      const bearStr = bearings.length === 1 ? ` — bearing: ${bearings[0]}°` : bearings.length > 1 ? ` — bearing: ${bearings[0]}°…${bearings[bearings.length - 1]}°` : '';
      lines.push(
        `  ${label.padEnd(5)} [${rangeStr}]: OBSTACLE ${min.toFixed(2)}m (mean ${mean!.toFixed(1)}m)${bearStr}`
      );
    } else {
      lines.push(`  ${label.padEnd(5)} [${rangeStr}]: clear, nearest ${min.toFixed(1)}m`);
    }
  }

  function angleToPaddedSector(angleDeg: number): string {
    const a = ((angleDeg % 360) + 360) % 360;
    if (a <= 45 || a >= 315) return 'Front';
    if (a > 45 && a <= 135) return 'Left';
    if (a > 135 && a <= 225) return 'Rear';
    return 'Right';
  }

  const clusters = findClusters(8.0).sort((a, b) => a.dist - b.dist);
  lines.push('');
  if (clusters.length > 0) {
    lines.push('Detected objects (robot-frame):');
    for (const c of clusters) {
      lines.push(
        `  - ${c.dist}m at ${c.angle}° → ${angleToPaddedSector(c.angle)} sector (~${c.approxWidth}m wide)`
      );
    }
  } else {
    lines.push('No significant objects detected nearby.');
  }

  const validAll = ranges.filter(isValid);
  if (validAll.length > 0) {
    const nearest = Math.min(...validAll);
    const nearestI = ranges.indexOf(nearest);
    const nearestDeg = toDeg(angle_min + nearestI * angle_increment).toFixed(1);
    lines.push('');
    lines.push(`Nearest point: ${nearest.toFixed(2)}m at ${nearestDeg}° (robot-frame)`);
  }

  return lines.join('\n');
}

export { parseLidarScan };

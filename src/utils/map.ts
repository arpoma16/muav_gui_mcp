import { apiPost } from '../utils.js';

type CellStatus = 'FREE' | 'OCCUPIED' | 'UNKNOWN' | 'OUT_OF_MAP';

interface GridCell {
  status: CellStatus;
  centerX: number;
  centerY: number;
  row: number;
  col: number;
}

type OccupancyMap = {
  resolution: number;
  width: number;
  height: number;
  originX: number;
  originY: number;
  cells: number[];
};

const mapCache = new Map<string, OccupancyMap>();

async function fetchOccupancyMap(namespace: string): Promise<OccupancyMap> {
  if (mapCache.has(namespace)) return mapCache.get(namespace)!;

  const raw = await apiPost(
    '/ros/service_call',
    {
      service: `/${namespace}/map_server/map`,
      messageType: 'nav_msgs/srv/GetMap',
      message: {},
    },
    10_000
  );

  const mapData = raw?.map ?? raw;
  const info = mapData.info;
  const map: OccupancyMap = {
    resolution: info.resolution as number,
    width: info.width as number,
    height: info.height as number,
    originX: info.origin.position.x as number,
    originY: info.origin.position.y as number,
    cells: mapData.data as number[],
  };

  mapCache.set(namespace, map);
  return map;
}

function classifyCell(cx: number, cy: number, cellSize: number, map: OccupancyMap): CellStatus {
  const { resolution, width, height, originX, originY, cells } = map;
  const half = cellSize / 2;

  const colMin = Math.max(0, Math.floor((cx - half - originX) / resolution));
  const colMax = Math.min(width - 1, Math.floor((cx + half - originX) / resolution));
  const rowMin = Math.max(0, Math.floor((cy - half - originY) / resolution));
  const rowMax = Math.min(height - 1, Math.floor((cy + half - originY) / resolution));

  let total = 0;
  let occupied = 0;
  let unknown = 0;

  for (let r = rowMin; r <= rowMax; r++) {
    for (let c = colMin; c <= colMax; c++) {
      const idx = c + r * width;
      if (idx < 0 || idx >= cells.length) continue;
      const val = cells[idx];
      total++;
      if (val === -1) unknown++;
      else if (val >= 50) occupied++;
    }
  }

  if (total === 0) return 'OUT_OF_MAP';
  if (occupied > 0) return 'OCCUPIED';
  if (unknown / total > 0.5) return 'UNKNOWN';
  return 'FREE';
}

function buildGrid(cx: number, cy: number, cellSize: number, map: OccupancyMap): GridCell[][] {
  const grid: GridCell[][] = [];
  for (let gi = 0; gi < 3; gi++) {
    const row: GridCell[] = [];
    for (let gj = 0; gj < 3; gj++) {
      const sx = cx + (gj - 1) * cellSize;
      const sy = cy + (1 - gi) * cellSize;
      row.push({
        status: classifyCell(sx, sy, cellSize, map),
        centerX: sx,
        centerY: sy,
        row: gi,
        col: gj,
      });
    }
    grid.push(row);
  }
  return grid;
}

function renderGridText(grid: GridCell[][], cellSize: number): string {
  const symbols: Record<CellStatus, string> = {
    FREE: '[ FREE ]',
    OCCUPIED: '[OCCUPD]',
    UNKNOWN: '[ UNK? ]',
    OUT_OF_MAP: '[OUT   ]',
  };

  const header = `3x3 grid (cell=${cellSize}m) — col: left | center | right / row: top | center | bottom\n`;
  const rows = grid.map(row =>
    row.map(c => `${symbols[c.status]}(${c.centerX.toFixed(1)},${c.centerY.toFixed(1)})`).join('  ')
  );
  return header + rows.join('\n');
}

export async function checkMapGrid(
  cx: number,
  cy: number,
  namespace: string,
  cellSize: number = 2.0
): Promise<{ grid: GridCell[][]; visual: string }> {
  const map = await fetchOccupancyMap(namespace);
  const grid = buildGrid(cx, cy, cellSize, map);
  const visual = renderGridText(grid, cellSize);
  return { grid, visual };
}

export { GridCell, CellStatus };

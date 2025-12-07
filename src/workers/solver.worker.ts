type SolverMessage = {
  tiles: number[];
  size: number;
};

type Node = {
  tiles: number[];
  emptyIdx: number;
  g: number;
  h: number;
  f: number;
  firstMoveIdx: number | null;
};

const getManhattanDistance = (tiles: number[], size: number) => {
  let distance = 0;
  for (let i = 0; i < tiles.length; i++) {
    const value = tiles[i];
    if (value === tiles.length - 1) continue;
    const targetRow = Math.floor(value / size);
    const targetCol = value % size;
    const currentRow = Math.floor(i / size);
    const currentCol = i % size;
    distance +=
      Math.abs(currentRow - targetRow) + Math.abs(currentCol - targetCol);
  }
  return distance;
};

const solveNextMove = (tiles: number[], size: number): number | null => {
  const targetStr = Array.from({ length: size * size }, (_, i) => i).join(",");

  if (tiles.join(",") === targetStr) return null;

  const queue: Node[] = [];
  const visited = new Set<string>();
  const emptyIdx = tiles.indexOf(size * size - 1);

  const initialH = getManhattanDistance(tiles, size);

  const startNode: Node = {
    tiles: [...tiles],
    emptyIdx,
    g: 0,
    h: initialH,
    f: initialH,
    firstMoveIdx: null,
  };

  queue.push(startNode);

  let bestNode: Node = startNode;

  let iterations = 0;

  const MAX_ITERATIONS = size >= 5 ? 30000 : 15000;
  const weight = size >= 4 ? 5.0 : 1.2;

  while (queue.length > 0) {
    queue.sort((a, b) => a.f - b.f);

    const current = queue.shift()!;
    const currentStr = current.tiles.join(",");

    if (current.h < bestNode.h) {
      bestNode = current;
    }

    if (currentStr === targetStr) {
      return current.firstMoveIdx;
    }

    if (visited.has(currentStr)) continue;
    visited.add(currentStr);

    if (iterations++ > MAX_ITERATIONS) {
      return bestNode.firstMoveIdx;
    }

    const { emptyIdx: currEmpty, tiles: currTiles, g } = current;
    const row = Math.floor(currEmpty / size);
    const col = currEmpty % size;

    const moves = [];
    if (row > 0) moves.push(currEmpty - size);
    if (row < size - 1) moves.push(currEmpty + size);
    if (col > 0) moves.push(currEmpty - 1);
    if (col < size - 1) moves.push(currEmpty + 1);

    for (const moveIdx of moves) {
      const newTiles = [...currTiles];
      [newTiles[currEmpty], newTiles[moveIdx]] = [
        newTiles[moveIdx],
        newTiles[currEmpty],
      ];

      if (visited.has(newTiles.join(","))) continue;

      const newH = getManhattanDistance(newTiles, size);
      const newG = g + 1;

      queue.push({
        tiles: newTiles,
        emptyIdx: moveIdx,
        g: newG,
        h: newH,
        f: newG + newH * weight,
        firstMoveIdx:
          current.firstMoveIdx === null ? moveIdx : current.firstMoveIdx,
      });
    }
  }

  return bestNode.firstMoveIdx;
};

self.onmessage = (e: MessageEvent<SolverMessage>) => {
  const { tiles, size } = e.data;
  try {
    const nextMoveIndex = solveNextMove(tiles, size);
    self.postMessage(nextMoveIndex);
  } catch (error) {
    console.error("Worker Error:", error);
    self.postMessage(null);
  }
};

export {};

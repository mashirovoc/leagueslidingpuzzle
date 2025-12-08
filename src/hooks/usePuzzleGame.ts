import { calculateScore } from "@/lib/game-utils";
import type { FilterType } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";
import seedrandom from "seedrandom";

interface UsePuzzleGameProps {
  gridSize: number;
  isVoidMode: boolean;
  filterType: FilterType;
  onMove?: (
    progress: number,
    score: number,
    moves: number,
    tiles: number[]
  ) => void;
  onSolve?: (score: number, timeElapsed: number) => void;
}

export const usePuzzleGame = ({
  gridSize,
  isVoidMode,
  filterType,
  onMove,
  onSolve,
}: UsePuzzleGameProps) => {
  const [tiles, setTiles] = useState<number[]>([]);
  const [isSolved, setIsSolved] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [moves, setMoves] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [score, setScore] = useState(0);

  const [isAssistMode, setIsAssistMode] = useState(false);
  const [hasUsedAssist, setHasUsedAssist] = useState(false);
  const [hintTileIndex, setHintTileIndex] = useState<number | null>(null);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/solver.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current.onmessage = (e: MessageEvent<number | null>) =>
      setHintTileIndex(e.data);
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (!isAssistMode || isSolved || !isPlaying || isVoidMode || gridSize > 5) {
      setHintTileIndex(null);
      return;
    }
    workerRef.current?.postMessage({ tiles, size: gridSize });
  }, [tiles, isAssistMode, isSolved, isPlaying, isVoidMode, gridSize]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlaying && !isSolved) {
      timer = setInterval(() => {
        setTimeElapsed((prev) => {
          const nextTime = prev + 1;
          setScore(
            calculateScore(
              gridSize,
              moves,
              nextTime,
              isVoidMode,
              filterType,
              hasUsedAssist
            )
          );
          return nextTime;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [
    isPlaying,
    isSolved,
    moves,
    gridSize,
    isVoidMode,
    filterType,
    hasUsedAssist,
  ]);

  const resetGame = useCallback(
    (overrideGridSize?: number) => {
      const size = overrideGridSize ?? gridSize;
      const totalTiles = size * size;
      const initialTiles = Array.from({ length: totalTiles }, (_, i) => i);

      setTiles(initialTiles);
      setIsSolved(true);
      setIsPlaying(false);
      setMoves(0);
      setTimeElapsed(0);
      setScore(0);
      setHintTileIndex(null);
      setHasUsedAssist(false);
    },
    [gridSize]
  );

  const shuffleBoard = useCallback(
    (seed?: number) => {
      const totalTiles = gridSize * gridSize;
      const currentTiles = [...Array.from({ length: totalTiles }, (_, i) => i)];
      let emptyIdx = currentTiles.indexOf(totalTiles - 1);
      let previousIdx = -1;
      const shuffleMoves = Math.max(150, totalTiles * 15);

      const rng = seed ? seedrandom(seed.toString()) : Math.random;

      for (let i = 0; i < shuffleMoves; i++) {
        const possibleMoves = [];
        const row = Math.floor(emptyIdx / gridSize);
        const col = emptyIdx % gridSize;
        if (row > 0) possibleMoves.push(emptyIdx - gridSize);
        if (row < gridSize - 1) possibleMoves.push(emptyIdx + gridSize);
        if (col > 0) possibleMoves.push(emptyIdx - 1);
        if (col < gridSize - 1) possibleMoves.push(emptyIdx + 1);

        const validMoves = possibleMoves.filter((idx) => idx !== previousIdx);
        const randomMove = validMoves[Math.floor(rng() * validMoves.length)];

        [currentTiles[emptyIdx], currentTiles[randomMove]] = [
          currentTiles[randomMove],
          currentTiles[emptyIdx],
        ];
        previousIdx = emptyIdx;
        emptyIdx = randomMove;
      }

      setTiles(currentTiles);
      setIsPlaying(true);
      setIsSolved(false);
      setMoves(0);
      setTimeElapsed(0);
      setScore(
        calculateScore(gridSize, 0, 0, isVoidMode, filterType, hasUsedAssist)
      );
      if (isAssistMode) setHasUsedAssist(true);
    },
    [gridSize, isAssistMode, isVoidMode, filterType, hasUsedAssist]
  );

  const handleTileClick = useCallback(
    (index: number) => {
      if (isSolved && !isPlaying) return;

      const emptyTileValue = gridSize * gridSize - 1;
      const emptyIndex = tiles.indexOf(emptyTileValue);
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      const emptyRow = Math.floor(emptyIndex / gridSize);
      const emptyCol = emptyIndex % gridSize;

      if (Math.abs(row - emptyRow) + Math.abs(col - emptyCol) === 1) {
        const newTiles = [...tiles];
        [newTiles[index], newTiles[emptyIndex]] = [
          newTiles[emptyIndex],
          newTiles[index],
        ];
        setTiles(newTiles);

        const nextMoves = moves + 1;
        setMoves(nextMoves);

        if (!isPlaying && !isSolved) setIsPlaying(true);

        let correctCount = 0;
        newTiles.forEach((val, i) => {
          if (val === i) correctCount++;
        });
        const progress = Math.floor(
          (correctCount / (gridSize * gridSize)) * 100
        );
        const currentScore = calculateScore(
          gridSize,
          nextMoves,
          timeElapsed,
          isVoidMode,
          filterType,
          hasUsedAssist
        );

        setScore(currentScore);

        if (onMove) {
          onMove(progress, currentScore, nextMoves, newTiles);
        }

        const isWin = newTiles.every((val, i) => val === i);
        if (isWin) {
          setIsSolved(true);
          setIsPlaying(false);
          setHintTileIndex(null);
          if (onSolve) {
            onSolve(currentScore, timeElapsed);
          }
        }
      }
    },
    [
      tiles,
      gridSize,
      isSolved,
      isPlaying,
      moves,
      timeElapsed,
      isVoidMode,
      filterType,
      hasUsedAssist,
      onMove,
      onSolve,
    ]
  );

  return {
    tiles,
    isSolved,
    isPlaying,
    moves,
    timeElapsed,
    score,
    hintTileIndex,
    isAssistMode,
    setIsAssistMode,
    setHasUsedAssist,
    hasUsedAssist,
    resetGame,
    shuffleBoard,
    handleTileClick,
    setTiles,
  };
};

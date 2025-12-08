import type { FilterType } from "@/lib/types";
import { memo, useMemo } from "react";
import Tile from "./Tile";

interface PuzzleBoardProps {
  tiles: number[];
  gridSize: number;
  isSolved: boolean;
  isPlaying: boolean;
  hintTileIndex: number | null;
  imageUrl: string;
  filterType: FilterType;
  onTileClick: (index: number) => void;
}

const PuzzleBoard = memo(
  ({
    tiles,
    gridSize,
    isSolved,
    isPlaying,
    hintTileIndex,
    imageUrl,
    filterType,
    onTileClick,
  }: PuzzleBoardProps) => {
    const tileIds = useMemo(
      () => Array.from({ length: gridSize * gridSize }, (_, i) => i),
      [gridSize]
    );

    return (
      <div className="w-full flex flex-col items-center justify-start">
        <div className="w-full max-w-[800px] rounded-lg overflow-hidden border bg-card transition-all void:border-primary/50 void:shadow-[0_0_30px_rgba(168,85,247,0.15)]">
          <div className="relative w-full aspect-video bg-white overflow-hidden">
            <div className="absolute inset-0 w-full h-full">
              {tileIds.map((tileValue) => {
                const currentIndex = tiles.indexOf(tileValue);

                if (currentIndex === -1) return null;

                return (
                  <Tile
                    key={tileValue}
                    tileValue={tileValue}
                    index={currentIndex}
                    gridSize={gridSize}
                    isSolved={isSolved}
                    isHint={currentIndex === hintTileIndex}
                    imageUrl={imageUrl}
                    filterType={filterType}
                    onClick={onTileClick}
                  />
                );
              })}
            </div>
            {!isPlaying && !isSolved && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 pointer-events-none"></div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
PuzzleBoard.displayName = "PuzzleBoard";

export default PuzzleBoard;

import { getFilterStyle } from "@/lib/game-utils";
import type { FilterType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Lightbulb } from "lucide-react";
import { memo, useMemo } from "react";

interface TileProps {
  tileValue: number;
  index: number;
  gridSize: number;
  isSolved: boolean;
  isHint: boolean;
  imageUrl: string;
  filterType: FilterType;
  onClick: (index: number) => void;
}

const Tile = memo(
  ({
    tileValue,
    index,
    gridSize,
    isSolved,
    isHint,
    imageUrl,
    filterType,
    onClick,
  }: TileProps) => {
    const isEmpty = tileValue === gridSize * gridSize - 1;
    const shouldHide = isEmpty && !isSolved;

    const style = useMemo(() => {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;

      const sizePercentage = 100 / gridSize;

      if (shouldHide)
        return {
          width: `${sizePercentage}%`,
          height: `${sizePercentage}%`,
          transform: `translate(${col * 100}%, ${row * 100}%)`,
        };

      const tRow = Math.floor(tileValue / gridSize);
      const tCol = tileValue % gridSize;
      const bgPositionPercentage = 100 / (gridSize - 1);

      return {
        width: `${sizePercentage}%`,
        height: `${sizePercentage}%`,
        transform: `translate(${col * 100}%, ${row * 100}%)`,
        backgroundImage: `url(${imageUrl})`,
        backgroundPosition: `${tCol * bgPositionPercentage}% ${
          tRow * bgPositionPercentage
        }%`,
        backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
        filter: filterType !== "blur" ? getFilterStyle(filterType) : undefined,
      };
    }, [tileValue, index, gridSize, shouldHide, imageUrl, filterType]);

    return (
      <div
        onClick={() => onClick(index)}
        className={cn(
          "absolute top-0 left-0 box-border transition-transform duration-200 ease-in-out border-background/50 bg-white",
          !shouldHide && "border cursor-pointer",
          shouldHide ? "opacity-0 pointer-events-none" : "opacity-100",
          !isSolved && !shouldHide && "hover:brightness-110",
          filterType === "blur" &&
            !shouldHide &&
            "blur-[3px] hover:blur-none transition-[filter] duration-200",
          isHint && "z-10"
        )}
        style={style}
      >
        {isHint && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 animate-pulse">
            <Lightbulb className="w-8 h-8 text-yellow-400 fill-yellow-400 drop-shadow-md animate-bounce" />
          </div>
        )}
      </div>
    );
  }
);
Tile.displayName = "Tile";

export default Tile;

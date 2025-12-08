import type { FilterType } from "@/lib/types";

export const getFilterStyle = (type: FilterType) => {
  switch (type) {
    case "grayscale":
      return "grayscale(100%)";
    case "invert":
      return "invert(100%)";
    case "void":
      return "sepia(100%) hue-rotate(240deg) saturate(200%) contrast(120%)";
    case "contrast":
      return "contrast(150%) saturate(120%)";
    case "blur":
      return undefined;
    default:
      return undefined;
  }
};

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

export const calculateScore = (
  gridSize: number,
  moves: number,
  seconds: number,
  isVoidMode: boolean,
  filterType: FilterType,
  hasUsedAssist: boolean
) => {
  const baseScore = gridSize * gridSize * 1000;
  const movePenalty = moves * 10;
  const timePenalty = seconds * 5;
  let currentScore = baseScore - movePenalty - timePenalty;
  if (currentScore < 0) currentScore = 0;

  let multiplier = 1.0;
  if (isVoidMode) {
    switch (filterType) {
      case "none":
        multiplier = 1.1;
        break;
      case "grayscale":
        multiplier = 1.2;
        break;
      case "contrast":
      case "void":
      case "invert":
        multiplier = 1.5;
        break;
      case "blur":
        multiplier = 1.7;
        break;
      default:
        multiplier = 1.0;
    }
  }
  currentScore = Math.floor(currentScore * multiplier);
  if (hasUsedAssist) currentScore = Math.floor(currentScore * 0.01);
  return currentScore;
};

import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import {
  Clock,
  Eye,
  EyeOff,
  Ghost,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  Medal,
  RefreshCw,
  Shuffle,
  Trophy,
} from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

type Champion = {
  id: string;
  name: string;
  title: string;
};

interface DDragonChampionRaw {
  id: string;
  name: string;
  title: string;
  [key: string]: unknown;
}

type Skin = {
  id: string;
  num: number;
  name: string;
  chromas: boolean;
};

type FilterType =
  | "none"
  | "grayscale"
  | "invert"
  | "void"
  | "contrast"
  | "blur";

const getFilterStyle = (type: FilterType) => {
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

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const useLeagueData = () => {
  const [version, setVersion] = useState<string | null>(null);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
      try {
        const verRes = await fetch(`${DDRAGON_BASE}/api/versions.json`);
        const verData = await verRes.json();
        const latestVer = verData[0];
        setVersion(latestVer);

        const champRes = await fetch(
          `${DDRAGON_BASE}/cdn/${latestVer}/data/ja_JP/champion.json`
        );
        const champData = await champRes.json();

        const champList = Object.values(
          champData.data as Record<string, DDragonChampionRaw>
        )
          .map((c) => ({
            id: c.id,
            name: c.name,
            title: c.title,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "ja"));

        setChampions(champList);
      } catch (e) {
        console.error("LoLデータの取得に失敗しました", e);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  return { version, champions, loading };
};

const useGameTimer = (isPlaying: boolean, isSolved: boolean) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying && !isSolved) {
      timerRef.current = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isSolved]);

  const resetTimer = useCallback(() => setTimeElapsed(0), []);
  return { timeElapsed, resetTimer };
};

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

      if (shouldHide)
        return {
          width: `${100 / gridSize}%`,
          height: `${100 / gridSize}%`,
          transform: `translate(${col * 100}%, ${row * 100}%)`,
        };

      const tRow = Math.floor(tileValue / gridSize);
      const tCol = tileValue % gridSize;
      const percentage = 100 / (gridSize - 1);

      return {
        width: `${100 / gridSize}%`,
        height: `${100 / gridSize}%`,
        transform: `translate(${col * 100}%, ${row * 100}%)`,
        backgroundImage: `url(${imageUrl})`,
        backgroundPosition: `${tCol * percentage}% ${tRow * percentage}%`,
        backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
        filter: filterType !== "blur" ? getFilterStyle(filterType) : undefined,
      };
    }, [tileValue, index, gridSize, shouldHide, imageUrl, filterType]);

    return (
      <div
        onClick={() => onClick(index)}
        className={cn(
          "absolute top-0 left-0 box-border",
          "transition-transform duration-200 ease-in-out",
          "border-background/50",
          !shouldHide && "border",
          !shouldHide && "cursor-pointer",
          "bg-white",
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

interface PuzzleBoardProps {
  tiles: number[];
  gridSize: number;
  isSolved: boolean;
  isPlaying: boolean;
  moves: number;
  hintTileIndex: number | null;
  imageUrl: string;
  isVoidMode: boolean;
  filterType: FilterType;
  onTileClick: (index: number) => void;
  onShuffle: () => void;
}

const PuzzleBoard = memo(
  ({
    tiles,
    gridSize,
    isSolved,
    isPlaying,
    moves,
    hintTileIndex,
    imageUrl,
    isVoidMode,
    filterType,
    onTileClick,
    onShuffle,
  }: PuzzleBoardProps) => {
    const tileIds = useMemo(
      () => Array.from({ length: gridSize * gridSize }, (_, i) => i),
      [gridSize]
    );

    const isGameActive = isPlaying || (moves > 0 && !isSolved);

    return (
      <div className="w-full flex flex-col items-center justify-start">
        <div className="w-full max-w-[800px] rounded-lg overflow-hidden border bg-card transition-all void:border-primary/50 void:shadow-[0_0_30px_rgba(168,85,247,0.15)]">
          <div className="relative w-full aspect-video bg-white overflow-hidden">
            <div className="absolute inset-0 w-full h-full">
              {tileIds.map((tileValue) => {
                const currentIndex = tiles.indexOf(tileValue);
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

            {!isPlaying && !isSolved && moves === 0 && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 void:bg-background/90">
                <ImageIcon className="h-16 w-16 mb-4 opacity-50 text-muted-foreground void:text-primary" />
                <h3 className="text-2xl font-bold mb-2 text-foreground void:text-primary">
                  {isVoidMode ? "深淵を覗く覚悟は？" : "準備完了？"}
                </h3>
                <p className="text-muted-foreground mb-6">
                  シャッフルしてゲームを開始してください
                </p>
                <Button size="lg" onClick={onShuffle} disabled={isGameActive}>
                  <Shuffle className="mr-2 h-4 w-4" /> ゲーム開始
                </Button>
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          ※ Data Dragon APIを使用しています。
        </p>
      </div>
    );
  }
);
PuzzleBoard.displayName = "PuzzleBoard";

const App = () => {
  const { version, champions, loading } = useLeagueData();
  const initializedRef = useRef(false);

  const [selectedChampId, setSelectedChampId] = useState<string>("");
  const [skins, setSkins] = useState<Skin[]>([]);
  const [selectedSkinId, setSelectedSkinId] = useState<string>("");

  const [gridSize, setGridSize] = useState(3);
  const [isVoidMode, setIsVoidMode] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("none");

  const [isAssistMode, setIsAssistMode] = useState(false);
  const [hasUsedAssist, setHasUsedAssist] = useState(false);
  const [hintTileIndex, setHintTileIndex] = useState<number | null>(null);

  const [tiles, setTiles] = useState<number[]>([]);
  const [isSolved, setIsSolved] = useState(false);
  const [moves, setMoves] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);

  const [showExample, setShowExample] = useState(true);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const workerRef = useRef<Worker | null>(null);

  const { timeElapsed, resetTimer } = useGameTimer(isPlaying, isSolved);

  const isGameActive = isPlaying || (moves > 0 && !isSolved);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("./workers/solver.worker.ts", import.meta.url),
      { type: "module" }
    );

    workerRef.current.onmessage = (e: MessageEvent<number | null>) => {
      setHintTileIndex(e.data);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (!isAssistMode || isSolved || !isPlaying || isVoidMode) {
      setHintTileIndex(null);
      return;
    }

    workerRef.current?.postMessage({ tiles, size: gridSize });
  }, [tiles, isAssistMode, isSolved, isPlaying, isVoidMode, gridSize]);

  useEffect(() => {
    if (
      !initializedRef.current &&
      !loading &&
      champions.length > 0 &&
      !selectedChampId
    ) {
      setSelectedChampId("Ahri");
      initializedRef.current = true;
    }
  }, [loading, champions, selectedChampId]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (mediaQuery.matches) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    };
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!selectedChampId || !version) return;
    const fetchSkinData = async () => {
      try {
        const res = await fetch(
          `${DDRAGON_BASE}/cdn/${version}/data/ja_JP/champion/${selectedChampId}.json`
        );
        const data = await res.json();
        const champDetails = data.data[selectedChampId];
        setSkins(champDetails.skins);
        if (champDetails.skins.length > 0) {
          setSelectedSkinId(champDetails.skins[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchSkinData();
  }, [selectedChampId, version]);

  const resetGame = useCallback(
    (overrideGridSize?: number) => {
      const size = overrideGridSize ?? gridSize;
      const totalTiles = size * size;
      const initialTiles = Array.from({ length: totalTiles }, (_, i) => i);

      setTiles(initialTiles);
      setIsSolved(true);
      setIsPlaying(false);
      setMoves(0);
      resetTimer();
      setScore(0);
      setShowSuccessDialog(false);
      setHintTileIndex(null);
      setHasUsedAssist(false);
    },
    [gridSize, resetTimer]
  );

  useEffect(() => {
    resetGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSkinChange = useCallback(
    (val: string) => {
      setSelectedSkinId(val);
      resetGame();
    },
    [resetGame]
  );

  const handleGridSizeChange = useCallback(
    (newSize: number) => {
      setGridSize(newSize);
      if (newSize > 5) {
        setIsAssistMode(false);
        setHintTileIndex(null);
      }
      resetGame(newSize);
    },
    [resetGame]
  );

  const handleAssistToggle = useCallback((checked: boolean) => {
    setIsAssistMode(checked);
    if (checked) {
      setHasUsedAssist(true);
    } else {
      setHintTileIndex(null);
    }
  }, []);

  const handleVoidModeToggle = useCallback(
    (checked: boolean) => {
      setIsVoidMode(checked);
      if (checked) {
        setGridSize(6);
        setFilterType("void");
        setShowExample(false);
        setIsAssistMode(false);
        setHintTileIndex(null);
        resetGame(6);
      } else {
        setGridSize(3);
        setFilterType("none");
        setShowExample(true);
        resetGame(3);
      }
    },
    [resetGame]
  );

  const getImageUrl = useMemo(() => {
    if (!selectedChampId || !selectedSkinId) return "";
    const skin = skins.find((s) => s.id === selectedSkinId);
    if (!skin) return "";
    return `${DDRAGON_BASE}/cdn/img/champion/splash/${selectedChampId}_${skin.num}.jpg`;
  }, [selectedChampId, selectedSkinId, skins]);

  const shuffleBoard = useCallback(() => {
    const totalTiles = gridSize * gridSize;
    const currentTiles = [...Array.from({ length: totalTiles }, (_, i) => i)];
    let emptyIdx = currentTiles.indexOf(totalTiles - 1);
    let previousIdx = -1;

    const shuffleMoves = Math.max(150, totalTiles * 15);

    for (let i = 0; i < shuffleMoves; i++) {
      const possibleMoves = [];
      const row = Math.floor(emptyIdx / gridSize);
      const col = emptyIdx % gridSize;

      if (row > 0) possibleMoves.push(emptyIdx - gridSize);
      if (row < gridSize - 1) possibleMoves.push(emptyIdx + gridSize);
      if (col > 0) possibleMoves.push(emptyIdx - 1);
      if (col < gridSize - 1) possibleMoves.push(emptyIdx + 1);

      const validMoves = possibleMoves.filter((idx) => idx !== previousIdx);
      const randomMove =
        validMoves[Math.floor(Math.random() * validMoves.length)];

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
    resetTimer();
    setScore(0);
    setShowSuccessDialog(false);
    if (isAssistMode) setHasUsedAssist(true);
  }, [gridSize, isAssistMode, resetTimer]);

  const calculateScore = useCallback(
    (currentMoves: number, currentSeconds: number) => {
      const baseScore = gridSize * gridSize * 1000;
      const movePenalty = currentMoves * 10;
      const timePenalty = currentSeconds * 5;

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
      if (hasUsedAssist) {
        currentScore = Math.floor(currentScore * 0.05);
      }
      return currentScore;
    },
    [gridSize, isVoidMode, filterType, hasUsedAssist]
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

      const isAdjacent =
        Math.abs(row - emptyRow) + Math.abs(col - emptyCol) === 1;

      if (isAdjacent) {
        const newTiles = [...tiles];
        [newTiles[index], newTiles[emptyIndex]] = [
          newTiles[emptyIndex],
          newTiles[index],
        ];
        setTiles(newTiles);

        const nextMoves = moves + 1;
        setMoves(nextMoves);

        if (!isPlaying && !isSolved) {
          setIsPlaying(true);
        }

        const isWin = newTiles.every((val, i) => val === i);
        if (isWin) {
          setIsSolved(true);
          setIsPlaying(false);
          setHintTileIndex(null);

          const finalScore = calculateScore(nextMoves, timeElapsed);
          setScore(finalScore);

          setShowSuccessDialog(true);
          confetti({
            particleCount: isVoidMode ? 300 : 150,
            spread: 100,
            origin: { y: 0.6 },
            colors: isVoidMode ? ["#7c3aed", "#4c1d95", "#c4b5fd"] : undefined,
            zIndex: 2000,
          });
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
      calculateScore,
      isVoidMode,
    ]
  );

  const shareResult = useCallback(() => {
    const champName =
      champions.find((c) => c.id === selectedChampId)?.name || selectedChampId;
    const skinName =
      skins.find((s) => s.id === selectedSkinId)?.name || "Default";
    const skinText = skinName !== "default" ? ` (${skinName})` : "";
    const modeText = isVoidMode ? "【ヴォイドモード】" : "";
    const assistText = hasUsedAssist ? " (アシスト使用)" : "";

    const text = `League Sliding Puzzle${modeText}をクリア！${assistText}\n\n🏆 スコア: ${score.toLocaleString()}\n👤 ${champName}${skinText}\n🧩 サイズ: ${gridSize}x${gridSize}\n👊 手数: ${moves}\n⏱ 時間: ${formatTime(
      timeElapsed
    )}\n\nhttps://leaguepuzzle.mashiro3.com/`;

    const url = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }, [
    champions,
    selectedChampId,
    skins,
    selectedSkinId,
    isVoidMode,
    hasUsedAssist,
    score,
    gridSize,
    moves,
    timeElapsed,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-primary">
        <Loader2 className="h-12 w-12 animate-spin mb-4" />
        <p className="text-lg font-medium">データを読み込み中...</p>
      </div>
    );
  }

  const currentSkinName = skins.find((s) => s.id === selectedSkinId)?.name;
  const currentChampTitle = champions.find(
    (c) => c.id === selectedChampId
  )?.title;

  return (
    <div
      className={cn(
        "min-h-screen font-sans p-4 md:p-8 transition-colors duration-500 bg-background",
        isVoidMode ? "void" : ""
      )}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-foreground transition-colors void:text-primary">
              League Sliding Puzzle
            </h1>
            <p className="text-muted-foreground flex flex-col md:flex-row items-center justify-center md:justify-start gap-2">
              お気に入りのチャンピオンで遊んでみよう！
              {isVoidMode && (
                <Badge
                  variant="default"
                  className="bg-primary/20 text-primary hover:bg-primary/30"
                >
                  ヴォイドモード起動中
                </Badge>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <Card className="transition-all duration-300 void:shadow-[0_0_20px_-5px_oklch(0.65_0.22_280/0.3)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  設定
                  {isVoidMode && <Ghost className="w-4 h-4 text-primary" />}
                </CardTitle>
                <CardDescription>
                  {isVoidMode
                    ? "虚空の深淵へようこそ..."
                    : "チャンピオンと難易度を選んでください"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>チャンピオン</Label>
                  <Select
                    value={selectedChampId}
                    onValueChange={setSelectedChampId}
                    disabled={isGameActive}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="チャンピオンを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {champions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>スキン</Label>
                  <Select
                    value={selectedSkinId}
                    onValueChange={handleSkinChange}
                    disabled={isGameActive}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="スキンを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {skins.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name === "default" ? "クラシック" : s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Eye className="w-4 h-4" /> フィルター
                  </Label>
                  <Select
                    value={filterType}
                    onValueChange={(v) => setFilterType(v as FilterType)}
                    disabled={isGameActive}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="フィルターを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">通常 (Normal)</SelectItem>
                      <SelectItem value="grayscale">
                        白黒 (Grayscale)
                      </SelectItem>
                      <SelectItem value="invert">反転 (Invert)</SelectItem>
                      <SelectItem value="contrast">
                        高コントラスト (Contrast)
                      </SelectItem>
                      <SelectItem value="void">ヴォイド (Void)</SelectItem>
                      <SelectItem value="blur">ぼかし (Blur)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>難易度 (グリッド)</Label>
                    <div className="flex gap-2 flex-wrap">
                      {isVoidMode
                        ? [6, 8, 10].map((size) => (
                            <Button
                              key={size}
                              variant={
                                gridSize === size ? "default" : "outline"
                              }
                              onClick={() => handleGridSizeChange(size)}
                              className="flex-1"
                              disabled={isGameActive}
                            >
                              {size}x{size}
                            </Button>
                          ))
                        : [3, 4, 5].map((size) => (
                            <Button
                              key={size}
                              variant={
                                gridSize === size ? "default" : "outline"
                              }
                              onClick={() => handleGridSizeChange(size)}
                              className="flex-1"
                              disabled={isGameActive}
                            >
                              {size}x{size}
                            </Button>
                          ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3 bg-card/50">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="assist-mode"
                        className={cn(
                          "text-base flex items-center gap-2",
                          isAssistMode ? "text-yellow-500" : ""
                        )}
                      >
                        <Lightbulb
                          className={cn(
                            "w-4 h-4",
                            isAssistMode
                              ? "fill-yellow-500 text-yellow-500"
                              : ""
                          )}
                        />
                        アシストモード
                      </Label>
                      <div className="text-[0.8rem] text-muted-foreground">
                        {/* 文言のロジックを修正: 5x5まではOKとする */}
                        {isVoidMode
                          ? "ヴォイドモードでは使用不可"
                          : gridSize > 5
                          ? "5x5まで対応"
                          : hasUsedAssist
                          ? "使用済み (スコア大幅減点)"
                          : "次の手をヒント表示"}
                      </div>
                    </div>
                    <Switch
                      id="assist-mode"
                      checked={isAssistMode}
                      onCheckedChange={handleAssistToggle}
                      disabled={isVoidMode || gridSize > 5}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3 void:border-primary/50 bg-card/50">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="void-mode"
                        className={cn(
                          "text-base flex items-center gap-2",
                          isVoidMode ? "text-primary" : ""
                        )}
                      >
                        {isVoidMode ? (
                          <Ghost className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                        ヴォイドモード
                      </Label>
                      <div className="text-[0.8rem] text-muted-foreground">
                        {isVoidMode ? "深淵の難易度と視覚効果" : "通常モード"}
                      </div>
                    </div>
                    <Switch
                      id="void-mode"
                      checked={isVoidMode}
                      onCheckedChange={handleVoidModeToggle}
                      disabled={isGameActive}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center justify-center p-2 bg-muted rounded-lg">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                      手数
                    </div>
                    <div className="font-mono text-lg font-bold">{moves}</div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 bg-muted rounded-lg">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> 時間
                    </div>
                    <div className="font-mono text-lg font-bold">
                      {formatTime(timeElapsed)}
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 bg-muted rounded-lg">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center">
                      <Medal className="w-3 h-3 mr-1" /> スコア
                    </div>
                    <div className="font-mono text-lg font-bold">
                      {isSolved && moves > 0 ? score : "---"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    size="lg"
                    onClick={shuffleBoard}
                    disabled={isGameActive}
                  >
                    <Shuffle className="mr-2 h-4 w-4" /> ゲーム開始 (シャッフル)
                  </Button>
                  <Button variant="outline" onClick={() => resetGame()}>
                    <RefreshCw className="mr-2 h-4 w-4" /> リセット
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-example"
                    checked={showExample}
                    onCheckedChange={setShowExample}
                    disabled={isVoidMode}
                  />
                  <Label
                    htmlFor="show-example"
                    className={cn(isVoidMode && "text-muted-foreground")}
                  >
                    お手本画像を表示
                  </Label>
                </div>

                {isVoidMode && (
                  <p className="text-xs text-destructive flex items-center gap-1 animate-pulse">
                    <EyeOff className="w-3 h-3" />
                    ヴォイドモード中は使用できません
                  </p>
                )}

                {showExample && !isVoidMode && (
                  <div className="animate-in fade-in zoom-in-95 duration-300 relative">
                    <img
                      src={getImageUrl}
                      className="rounded-lg w-full"
                      alt="お手本"
                    />
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-center text-center">
                <div>
                  <h3 className="font-semibold text-lg">
                    {currentSkinName === "default"
                      ? selectedChampId
                      : currentSkinName}
                  </h3>
                  <Badge variant="secondary" className="mt-1">
                    {currentChampTitle}
                  </Badge>
                </div>
              </CardFooter>
            </Card>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-8">
            <PuzzleBoard
              tiles={tiles}
              gridSize={gridSize}
              isSolved={isSolved}
              isPlaying={isPlaying}
              moves={moves}
              hintTileIndex={hintTileIndex}
              imageUrl={getImageUrl}
              isVoidMode={isVoidMode}
              filterType={filterType}
              onTileClick={handleTileClick}
              onShuffle={shuffleBoard}
            />

            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  スコアシステムについて
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="calc">
                    <AccordionTrigger>基本計算式</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      <p className="mb-2">
                        スコア = (グリッドサイズ² × 1000) - (手数 × 10) - (秒数
                        × 5)
                      </p>
                      <p>
                        ※ 素早く少ない手数でクリアするほど高得点になります。
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="bonus">
                    <AccordionTrigger>
                      ヴォイドモードボーナス (フィルター別)
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                        <li>通常モード: ボーナスなし (x1.0)</li>
                        <li>
                          ヴォイドモード (通常フィルター):{" "}
                          <span className="font-bold text-primary">x1.1</span>
                        </li>
                        <li>
                          ヴォイドモード (白黒フィルター):{" "}
                          <span className="font-bold text-primary">x1.2</span>
                        </li>
                        <li>
                          ヴォイドモード (高コントラスト/ヴォイド/反転):{" "}
                          <span className="font-bold text-primary">x1.5</span>
                        </li>
                        <li>
                          ヴォイドモード (ぼかし):{" "}
                          <span className="font-bold text-primary">x1.7</span>
                        </li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="penalty">
                    <AccordionTrigger className="text-destructive">
                      アシストペナルティ
                    </AccordionTrigger>
                    <AccordionContent className="text-destructive">
                      <p>
                        ゲーム中に一度でもアシストモードをONにすると、最終スコアは計算結果の
                        <span className="font-bold">5%</span>
                        になります。
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md text-center void:border-primary/50">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <Trophy className="h-16 w-16 text-primary animate-bounce" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center">
              クリア！
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">SCORE</div>
              <div className="text-5xl font-black tracking-tighter text-primary">
                {score.toLocaleString()}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm font-medium bg-muted p-4 rounded-lg">
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs mb-1">手数</span>
                <span className="text-xl font-bold font-mono">{moves}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs mb-1">時間</span>
                <span className="text-xl font-bold font-mono">
                  {formatTime(timeElapsed)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs mb-1">
                  サイズ
                </span>
                <span className="text-xl font-bold font-mono">
                  {gridSize}x{gridSize}
                </span>
              </div>
            </div>
            <div className="relative aspect-video w-full rounded-md overflow-hidden border void:border-primary/50">
              <img
                src={getImageUrl}
                className="object-cover w-full h-full"
                style={{ filter: getFilterStyle(filterType) }}
                alt="Finished Puzzle"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              className="w-full bg-black hover:bg-zinc-800 text-white gap-2 dark:bg-white dark:text-black dark:hover:bg-zinc-200 void:bg-primary void:text-white void:hover:bg-primary/80"
              onClick={shareResult}
            >
              <FaXTwitter /> スコアを共有
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={shuffleBoard}>もう一度遊ぶ</Button>
              <Button
                variant="outline"
                onClick={() => setShowSuccessDialog(false)}
              >
                閉じる
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default App;

import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import {
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Shuffle,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
import { Switch } from "@/components/ui/switch"; // Switchコンポーネントを追加

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

const App = () => {
  const [version, setVersion] = useState<string | null>(null);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedChampId, setSelectedChampId] = useState<string>("");
  const [skins, setSkins] = useState<Skin[]>([]);
  const [selectedSkinId, setSelectedSkinId] = useState<string>("");
  const [gridSize, setGridSize] = useState(3);

  const [tiles, setTiles] = useState<number[]>([]);
  const [isSolved, setIsSolved] = useState(false);
  const [moves, setMoves] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // お手本表示の切り替えステート (デフォルトON)
  const [showExample, setShowExample] = useState(true);

  // クリア時のモーダル表示制御用
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const resetGame = useCallback(() => {
    const totalTiles = gridSize * gridSize;
    const initialTiles = Array.from({ length: totalTiles }, (_, i) => i);
    setTiles(initialTiles);
    setIsSolved(true);
    setIsPlaying(false);
    setMoves(0);
    setShowSuccessDialog(false);
  }, [gridSize]);

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
        setSelectedChampId("Ahri");
      } catch (e) {
        console.error("LoLデータの取得に失敗しました", e);
      } finally {
        setLoading(false);
      }
    };
    initData();
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

  useEffect(() => {
    resetGame();
  }, [selectedSkinId, gridSize, resetGame]);

  const getImageUrl = () => {
    if (!selectedChampId || !selectedSkinId) return "";
    const skin = skins.find((s) => s.id === selectedSkinId);
    if (!skin) return "";
    return `${DDRAGON_BASE}/cdn/img/champion/splash/${selectedChampId}_${skin.num}.jpg`;
  };

  const shuffleBoard = () => {
    const totalTiles = gridSize * gridSize;
    const currentTiles = [...tiles];
    let emptyIdx = currentTiles.indexOf(totalTiles - 1);
    let previousIdx = -1;

    for (let i = 0; i < 150; i++) {
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
    setShowSuccessDialog(false);
  };

  const checkWin = (currentTiles: number[]) => {
    const isWin = currentTiles.every((val, index) => val === index);
    if (isWin) {
      setIsSolved(true);
      setIsPlaying(false);
      setShowSuccessDialog(true);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 2000,
      });
    }
  };

  const handleTileClick = (index: number) => {
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
      setMoves((m) => m + 1);
      checkWin(newTiles);
    }
  };

  const getBackgroundStyle = (tileValue: number) => {
    const row = Math.floor(tileValue / gridSize);
    const col = tileValue % gridSize;
    const percentage = 100 / (gridSize - 1);

    return {
      backgroundImage: `url(${getImageUrl()})`,
      backgroundPosition: `${col * percentage}% ${row * percentage}%`,
      backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
    };
  };

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

  const tileIds = Array.from({ length: gridSize * gridSize }, (_, i) => i);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight">
              League Sliding Puzzle
            </h1>
            <p className="text-muted-foreground">
              お気に入りのチャンピオンで遊んでみよう！
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>設定</CardTitle>
                <CardDescription>
                  チャンピオンと難易度を選んでください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>チャンピオン</Label>
                  <Select
                    value={selectedChampId}
                    onValueChange={setSelectedChampId}
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
                    onValueChange={setSelectedSkinId}
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
                  <Label>難易度 (グリッド)</Label>
                  <div className="flex gap-2">
                    {[3, 4, 5].map((size) => (
                      <Button
                        key={size}
                        variant={gridSize === size ? "default" : "outline"}
                        onClick={() => setGridSize(size)}
                        className="flex-1"
                      >
                        {size}x{size}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm font-medium">移動回数</div>
                  <div className="font-mono text-2xl font-bold">{moves}</div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button size="lg" onClick={shuffleBoard}>
                    <Shuffle className="mr-2 h-4 w-4" /> ゲーム開始 (シャッフル)
                  </Button>
                  <Button variant="outline" onClick={resetGame}>
                    <RefreshCw className="mr-2 h-4 w-4" /> リセット
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-example"
                    checked={showExample}
                    onCheckedChange={setShowExample}
                  />
                  <Label htmlFor="show-example">お手本画像を表示</Label>
                </div>

                {showExample && (
                  <div className="animate-in fade-in zoom-in-95 duration-300">
                    <img
                      src={getImageUrl()}
                      className="rounded-lg border w-full"
                      alt="Example"
                    />
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-center text-center bg-muted/20">
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

          <div className="lg:col-span-8 flex flex-col items-center justify-start">
            <div className="w-full max-w-[800px] rounded-lg overflow-hidden border bg-card">
              <div className="relative w-full aspect-video bg-muted overflow-hidden">
                <div className="absolute inset-0 w-full h-full">
                  {tileIds.map((tileValue) => {
                    const currentIndex = tiles.indexOf(tileValue);

                    const row = Math.floor(currentIndex / gridSize);
                    const col = currentIndex % gridSize;

                    const isEmpty = tileValue === gridSize * gridSize - 1;
                    const shouldHide = isEmpty && !isSolved;

                    return (
                      <div
                        key={tileValue}
                        onClick={() => handleTileClick(currentIndex)}
                        className={cn(
                          "absolute top-0 left-0 box-border border-primary/20",
                          "transition-transform duration-200 ease-in-out",
                          !shouldHide && "cursor-pointer bg-muted",
                          shouldHide
                            ? "opacity-0 pointer-events-none"
                            : "opacity-100",
                          !isSolved && !shouldHide && "hover:brightness-110"
                        )}
                        style={{
                          width: `${100 / gridSize}%`,
                          height: `${100 / gridSize}%`,
                          transform: `translate(${col * 100}%, ${row * 100}%)`,
                          ...(!shouldHide ? getBackgroundStyle(tileValue) : {}),
                        }}
                      />
                    );
                  })}
                </div>

                {!isPlaying && !isSolved && moves === 0 && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                    <ImageIcon className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-2xl font-bold mb-2">準備完了？</h3>
                    <p className="text-muted-foreground mb-6">
                      シャッフルしてゲームを開始してください
                    </p>
                    <Button size="lg" onClick={shuffleBoard}>
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
        </div>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <Trophy className="h-16 w-16 text-yellow-500" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center">
              クリア！
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <p className="text-muted-foreground">
              おめでとうございます！パズルを完成させました。
            </p>
            <div className="flex justify-center gap-8 text-sm font-medium bg-muted/50 p-4 rounded-lg">
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs mb-1">
                  移動回数
                </span>
                <span className="text-2xl font-bold font-mono">{moves}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs mb-1">
                  サイズ
                </span>
                <span className="text-2xl font-bold font-mono">
                  {gridSize}x{gridSize}
                </span>
              </div>
            </div>
            <div className="relative aspect-video w-full rounded-md overflow-hidden border">
              <img
                src={getImageUrl()}
                className="object-cover w-full h-full"
                alt="Finished Puzzle"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button className="w-full sm:w-auto" onClick={shuffleBoard}>
              もう一度遊ぶ
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setShowSuccessDialog(false)}
            >
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default App;

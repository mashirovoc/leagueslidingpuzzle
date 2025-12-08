import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  Ghost,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  LogOut,
  Play,
  RefreshCw,
  Settings,
  User,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ResultDialog } from "@/components/game/ResultDialog";
import PuzzleBoard from "@/components/puzzle/PuzzleBoard";
import { useLeagueData } from "@/hooks/useLeagueData";
import { usePuzzleGame } from "@/hooks/usePuzzleGame";
import { DDRAGON_BASE, SERVER_URL } from "@/lib/constants";
import { formatTime, getFilterStyle } from "@/lib/game-utils";
import type {
  AlertState,
  AppState,
  FilterType,
  GameMode,
  Player,
  Room,
  Skin,
} from "@/lib/types";

type PendingSocketAction =
  | { type: "create"; username: string }
  | { type: "join"; roomId: string; username: string };

const App = () => {
  const { version, champions, loading } = useLeagueData();
  const initializedRef = useRef(false);

  const [appState, setAppState] = useState<AppState>("MENU");
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [username, setUsername] = useState("");
  const [roomIdInput, setRoomIdInput] = useState("");

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    title: "",
    description: "",
  });

  const socketRef = useRef<Socket | null>(null);
  const [mySocketId, setMySocketId] = useState<string | null>(null);

  const pendingActionRef = useRef<PendingSocketAction | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [finishedPlayers, setFinishedPlayers] = useState<Player[]>([]);

  const [selectedChampId, setSelectedChampId] = useState<string>("");
  const [skins, setSkins] = useState<Skin[]>([]);
  const [selectedSkinId, setSelectedSkinId] = useState<string>("");
  const [gridSize, setGridSize] = useState(3);
  const [isVoidMode, setIsVoidMode] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("none");
  const [multiplayerMode, setMultiplayerMode] =
    useState<GameMode>("TIME_ATTACK");
  const [showExample, setShowExample] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const hasShownLastOneAlertRef = useRef(false);

  const {
    tiles,
    isSolved,
    isPlaying,
    moves,
    timeElapsed,
    score,
    hintTileIndex,
    isAssistMode,
    setIsAssistMode,
    hasUsedAssist,
    setHasUsedAssist,
    resetGame,
    shuffleBoard,
    handleTileClick,
  } = usePuzzleGame({
    gridSize,
    isVoidMode,
    filterType,
    onMove: (progress, currentScore, currentMoves) => {
      if (isMultiplayer && room && socketRef.current) {
        socketRef.current.emit("update_progress", {
          roomId: room.id,
          progress,
          score: currentScore,
          moves: currentMoves,
        });
      }
    },
    onSolve: (finalScore, finalTime) => {
      if (!isMultiplayer) {
        setShowSuccessDialog(true);
        confetti({
          particleCount: isVoidMode ? 300 : 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: isVoidMode ? ["#7c3aed", "#4c1d95", "#c4b5fd"] : undefined,
          zIndex: 2000,
        });
      } else {
        socketRef.current?.emit("player_finished", {
          roomId: room?.id,
          timeElapsed: finalTime,
          score: finalScore,
        });
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 } });
      }
    },
  });

  const shuffleBoardRef = useRef(shuffleBoard);
  useEffect(() => {
    shuffleBoardRef.current = shuffleBoard;
  }, [shuffleBoard]);

  const handleExit = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setMySocketId(null);
    setIsMultiplayer(false);
    setAppState("MENU");
    setRoom(null);
    setAlertState({ open: false, title: "", description: "" });
    resetGame();
  }, [resetGame]);

  const resetGameCallback = useCallback(
    (overrideSize?: number) => {
      resetGame(overrideSize);
      setShowSuccessDialog(false);
      setWinnerId(null);
      setFinishedPlayers([]);
      hasShownLastOneAlertRef.current = false;
    },
    [resetGame]
  );

  useEffect(() => {
    if (isMultiplayer) {
      if (!socketRef.current) {
        socketRef.current = io(SERVER_URL);
      }
      const socket = socketRef.current;
      socket.off();

      if (!socket.connected) socket.connect();

      const executePendingAction = () => {
        if (pendingActionRef.current) {
          const action = pendingActionRef.current;
          if (action.type === "create") {
            socket.emit("create_room", { username: action.username });
          } else if (action.type === "join") {
            socket.emit("join_room", {
              roomId: action.roomId,
              username: action.username,
            });
          }
          pendingActionRef.current = null;
        }
      };

      socket.on("connect", () => {
        console.log("Connected", socket.id);
        setMySocketId(socket.id || null);
        executePendingAction();
      });

      if (socket.connected && !mySocketId) {
        setMySocketId(socket.id || null);
        executePendingAction();
      }

      socket.on("error", (err: { message: string }) => {
        setAlertState({
          open: true,
          title: "エラー",
          description: err.message,
          actionLabel: "トップへ",
          onAction: handleExit,
          showCancel: false,
        });
        setAppState("MENU");
      });

      socket.on("room_created", ({ room }) => {
        setRoom(room);
        setAppState("SETUP");
      });

      socket.on("joined_room", ({ room }) => {
        setRoom(room);
        setAppState("SETUP");
      });

      socket.on("room_update", (updatedRoom: Room) => {
        setRoom(updatedRoom);
        if (updatedRoom.settings) {
          setGridSize(updatedRoom.settings.gridSize);
          setIsVoidMode(updatedRoom.settings.isVoidMode);
          setMultiplayerMode(updatedRoom.settings.mode);
          setFilterType(updatedRoom.settings.filterType);
        }
        if (updatedRoom.championId) setSelectedChampId(updatedRoom.championId);
        if (updatedRoom.skinId) setSelectedSkinId(updatedRoom.skinId);
      });

      socket.on("game_started", (roomData: Room) => {
        setRoom(roomData);
        setAppState("GAME");
        hasShownLastOneAlertRef.current = false;
        shuffleBoardRef.current(roomData.seed);
      });

      socket.on("opponent_progress", ({ socketId, progress, score }) => {
        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            players: {
              ...prev.players,
              [socketId]: { ...prev.players[socketId], progress, score },
            },
          };
        });
      });

      socket.on("player_finished_notify", ({ socketId, time, score }) => {
        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            players: {
              ...prev.players,
              [socketId]: {
                ...prev.players[socketId],
                finished: true,
                finishTime: time,
                score,
              },
            },
          };
        });
      });

      socket.on("game_over", ({ players, winnerId }) => {
        setWinnerId(winnerId);
        const playerList = Object.values(players) as Player[];
        setFinishedPlayers(playerList);
        setRoom((prev) =>
          prev ? { ...prev, players, status: "FINISHED" } : null
        );
        setShowSuccessDialog(true);
      });

      socket.on("player_left", ({ socketId }) => {
        setRoom((prev) => {
          if (!prev) return null;
          const newPlayers = { ...prev.players };
          const leavingPlayer = prev.players[socketId];
          delete newPlayers[socketId];
          const remainingCount = Object.keys(newPlayers).length;

          if (leavingPlayer && leavingPlayer.isHost) {
            setAlertState({
              open: true,
              title: "ルーム解散",
              description:
                "ホストが退出したため、ルームを解散しトップに戻ります。",
              actionLabel: "トップへ戻る",
              onAction: handleExit,
              showCancel: false,
            });
            return { ...prev, players: newPlayers };
          }

          if (prev.status === "PLAYING" && remainingCount < 2) {
            setAlertState({
              open: true,
              title: "ゲーム終了",
              description: "対戦相手がいなくなったため、ゲームを終了します。",
              actionLabel: "設定へ戻る",
              onAction: () => {
                setAlertState((prev) => ({ ...prev, open: false }));
                setAppState("SETUP");
                resetGameCallback();
              },
              showCancel: false,
            });
          }
          return { ...prev, players: newPlayers };
        });
      });

      return () => {
        socket.off();
      };
    }
  }, [isMultiplayer, handleExit, resetGameCallback, mySocketId]);

  useEffect(() => {
    if (
      !initializedRef.current &&
      !loading &&
      champions.length > 0 &&
      selectedChampId === ""
    ) {
      setSelectedChampId("Ahri");
      initializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, champions]);

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
        const newSkins = champDetails.skins;
        setSkins(newSkins);

        const isGuest =
          isMultiplayer && room && !room.players[mySocketId || ""]?.isHost;
        if (!isGuest && newSkins.length > 0) {
          const currentSkinExists = newSkins.some(
            (s: Skin) => s.id === selectedSkinId
          );
          if (!currentSkinExists || !isMultiplayer) {
            setSelectedSkinId(newSkins[0].id);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchSkinData();
  }, [
    selectedChampId,
    version,
    isMultiplayer,
    room,
    selectedSkinId,
    mySocketId,
  ]);

  const currentRoomId = room?.id;
  const isCurrentHost = room?.players[mySocketId || ""]?.isHost;

  useEffect(() => {
    if (isMultiplayer && currentRoomId && isCurrentHost) {
      socketRef.current?.emit("update_settings", {
        roomId: currentRoomId,
        settings: { gridSize, isVoidMode, mode: multiplayerMode, filterType },
        championId: selectedChampId,
        skinId: selectedSkinId,
      });
    }
  }, [
    gridSize,
    isVoidMode,
    multiplayerMode,
    selectedChampId,
    selectedSkinId,
    filterType,
    isMultiplayer,
    currentRoomId,
    isCurrentHost,
  ]);

  useEffect(() => {
    resetGameCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getImageUrl = useMemo(() => {
    if (!selectedChampId || !selectedSkinId) return "";

    const skin = skins.find((s) => s.id === selectedSkinId);

    if (!skin || !selectedSkinId.startsWith(selectedChampId)) {
      return "";
    }

    return `${DDRAGON_BASE}/cdn/img/champion/splash/${selectedChampId}_${skin.num}.jpg`;
  }, [selectedChampId, selectedSkinId, skins]);

  const isHost = isMultiplayer
    ? room?.players[mySocketId || ""]?.isHost ?? false
    : true;
  const canControlSettings =
    !isMultiplayer || (isMultiplayer && isHost && appState === "SETUP");
  const playerCount = room ? Object.keys(room.players).length : 0;
  const allGuestsReady = room
    ? Object.values(room.players)
        .filter((p) => !p.isHost)
        .every((p) => p.isReady)
    : false;
  const canStartGame =
    !isMultiplayer || (isMultiplayer && playerCount >= 2 && allGuestsReady);
  const myPlayer = room?.players[mySocketId || ""];
  const showControlPanel = !isVoidMode;

  const isTimeAttackLastOne = useMemo(() => {
    if (!isMultiplayer || !room || multiplayerMode !== "TIME_ATTACK")
      return false;
    const finishedCount = Object.values(room.players).filter(
      (p) => p.finished
    ).length;
    return !isSolved && finishedCount === playerCount - 1 && playerCount > 1;
  }, [isMultiplayer, room, multiplayerMode, isSolved, playerCount]);

  useEffect(() => {
    if (isTimeAttackLastOne && !hasShownLastOneAlertRef.current) {
      hasShownLastOneAlertRef.current = true;
      setAlertState({
        open: true,
        title: "残り1人です！",
        description: "他のプレイヤーは全員ゴールしました。最後まで諦めずに！",
        actionLabel: "閉じる",
        onAction: () => setAlertState((prev) => ({ ...prev, open: false })),
        showCancel: false,
      });
    }
  }, [isTimeAttackLastOne]);

  const handleGridSizeChange = useCallback(
    (newSize: number) => {
      setGridSize(newSize);
      if (!isMultiplayer) {
        if (newSize > 5) {
          setIsAssistMode(false);
        }
        resetGame(newSize);
      }
    },
    [resetGame, isMultiplayer, setIsAssistMode]
  );

  const handleVoidModeToggle = useCallback(
    (checked: boolean) => {
      setIsVoidMode(checked);
      if (isMultiplayer) {
        if (checked) {
          setGridSize(6);
          setFilterType("void");
        } else {
          setGridSize(3);
          setFilterType("none");
        }
      } else {
        if (checked) {
          setGridSize(6);
          setFilterType("void");
          setShowExample(false);
          setIsAssistMode(false);
          resetGame(6);
        } else {
          setGridSize(3);
          setFilterType("none");
          setShowExample(false);
          resetGame(3);
        }
      }
    },
    [resetGame, isMultiplayer, setIsAssistMode]
  );

  const handleCreateRoom = () => {
    pendingActionRef.current = { type: "create", username: username || "Host" };
    setIsMultiplayer(true);
    setAppState("CONNECTING");
  };

  const handleJoinRoom = () => {
    pendingActionRef.current = {
      type: "join",
      roomId: roomIdInput.toUpperCase(),
      username: username || "Player",
    };
    setIsMultiplayer(true);
    setAppState("CONNECTING");
  };

  const handleToggleReady = () => {
    if (room) {
      socketRef.current?.emit("toggle_ready", { roomId: room.id });
    }
  };

  const handleStartGame = () => {
    if (isMultiplayer) {
      if (room) socketRef.current?.emit("start_game", { roomId: room.id });
    } else {
      setAppState("GAME");
      shuffleBoard();
    }
  };

  const handleCloseResult = () => {
    setShowSuccessDialog(false);
    setAppState("SETUP");
    resetGameCallback();
  };

  const handleResetRequest = () => {
    setAlertState({
      open: true,
      title: "リセット確認",
      description: "パズルをシャッフルして最初からやり直しますか？",
      actionLabel: "リセット",
      onAction: () => {
        resetGameCallback();
        shuffleBoardRef.current();
        setAlertState((prev) => ({ ...prev, open: false }));
      },
      showCancel: true,
    });
  };

  const shareResult = useCallback(() => {
    const champName =
      champions.find((c) => c.id === selectedChampId)?.name || selectedChampId;
    const skinName =
      skins.find((s) => s.id === selectedSkinId)?.name || "Default";
    const skinText = skinName !== "default" ? ` (${skinName})` : "";

    let text = "";
    if (isMultiplayer) {
      const sorted = [...finishedPlayers].sort((a, b) => {
        if (multiplayerMode === "TIME_ATTACK") {
          const timeA = a.finishTime ?? 999999;
          const timeB = b.finishTime ?? 999999;
          if (timeA === timeB) return b.score - a.score;
          return timeA - timeB;
        }
        return b.score - a.score;
      });
      const myRank = sorted.findIndex((p) => p.socketId === mySocketId) + 1;
      text = `League Sliding Puzzle (Multiplayer)\n順位: ${myRank}位 / ${
        sorted.length
      }人中\n\n🏆 スコア: ${score.toLocaleString()}\n👤 ${champName}${skinText}\n🧩 サイズ: ${gridSize}x${gridSize}\n⏱ 時間: ${formatTime(
        timeElapsed
      )}\n\nhttps://leaguepuzzle.mashiro3.com/`;
    } else {
      text = `League Sliding Puzzleをクリア！${
        hasUsedAssist ? "(アシスト)" : ""
      }\n\n🏆 スコア: ${score.toLocaleString()}\n👤 ${champName}${skinText}\n🧩 サイズ: ${gridSize}x${gridSize}\n👊 手数: ${moves}\n⏱ 時間: ${formatTime(
        timeElapsed
      )}\n\nhttps://leaguepuzzle.mashiro3.com/`;
    }

    const url = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }, [
    champions,
    selectedChampId,
    skins,
    selectedSkinId,
    hasUsedAssist,
    score,
    gridSize,
    moves,
    timeElapsed,
    isMultiplayer,
    finishedPlayers,
    multiplayerMode,
    mySocketId,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-primary">
        <Loader2 className="h-12 w-12 animate-spin mb-4" />
        <p className="text-lg font-medium">データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen font-sans p-4 md:p-8 transition-colors duration-500 bg-background",
        isVoidMode ? "void" : ""
      )}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center relative">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-foreground transition-colors void:text-primary">
              League Sliding Puzzle
            </h1>
            <p className="text-muted-foreground flex flex-col md:flex-row items-center justify-center md:justify-start gap-2">
              お気に入りのチャンピオンで遊んでみよう！
              {isVoidMode && (
                <Badge variant="default" className="bg-primary/20 text-primary">
                  ヴォイドモード起動中
                </Badge>
              )}
              {isMultiplayer && (
                <Badge
                  variant="secondary"
                  className="bg-blue-500/10 text-blue-500"
                >
                  マルチプレイ中
                </Badge>
              )}
            </p>
          </div>
          {appState !== "MENU" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExit}
              className="absolute right-0 top-0 md:relative text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4 mr-2" /> トップへ戻る
            </Button>
          )}
        </div>

        {appState === "MENU" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-12">
            <Card
              className="hover:border-primary cursor-pointer transition-all hover:shadow-lg"
              onClick={() => {
                setIsMultiplayer(false);
                setAppState("SETUP");
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-6 h-6" /> シングルプレイ
                </CardTitle>
                <CardDescription>
                  一人でじっくりパズルを解くモードです。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-blue-500 cursor-pointer transition-all hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-6 h-6" /> マルチプレイ
                </CardTitle>
                <CardDescription>
                  部屋を作って友達と対戦するモードです。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>プレイヤー名</Label>
                  <Input
                    placeholder="名前を入力..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <Tabs defaultValue="create" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="create">部屋を作成</TabsTrigger>
                    <TabsTrigger value="join">部屋に参加</TabsTrigger>
                  </TabsList>
                  <TabsContent value="create" className="space-y-4 pt-4">
                    <Button className="w-full" onClick={handleCreateRoom}>
                      部屋を作成する
                    </Button>
                  </TabsContent>
                  <TabsContent value="join" className="space-y-4 pt-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="ルームID (6桁)"
                        value={roomIdInput}
                        onChange={(e) => setRoomIdInput(e.target.value)}
                        maxLength={6}
                        className="uppercase font-mono"
                      />
                      <Button onClick={handleJoinRoom}>参加</Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

        {appState === "CONNECTING" && (
          <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-lg font-medium text-muted-foreground">
              サーバーに接続中...
            </p>
          </div>
        )}

        {appState === "SETUP" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <Card className="transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    ゲーム設定{" "}
                    {isVoidMode && <Ghost className="w-4 h-4 text-primary" />}
                  </CardTitle>
                  <CardDescription>
                    {isMultiplayer
                      ? isHost
                        ? "対戦ルールを設定して開始してください"
                        : "ホストの設定を待っています..."
                      : "好みの設定を選んでください"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isMultiplayer && room && (
                    <>
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-5 h-5 animate-pulse" />
                          <span className="font-medium text-sm">
                            ルーム接続中
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            ID:
                          </span>
                          <span className="text-xl font-mono font-bold tracking-widest bg-background px-2 py-1 rounded border">
                            {room.id}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              navigator.clipboard.writeText(room.id)
                            }
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 pb-4 border-b">
                        <Label>勝負形式</Label>
                        {canControlSettings ? (
                          <Select
                            value={multiplayerMode}
                            onValueChange={(v) =>
                              setMultiplayerMode(v as GameMode)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TIME_ATTACK">
                                タイムアタック (早さ勝負)
                              </SelectItem>
                              <SelectItem value="SCORE_ATTACK">
                                スコアアタック (手数・時間総合)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-sm font-medium">
                            {multiplayerMode === "TIME_ATTACK"
                              ? "タイムアタック"
                              : "スコアアタック"}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>チャンピオン</Label>
                      {canControlSettings ? (
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
                      ) : (
                        <div className="text-sm font-medium">
                          {champions.find((c) => c.id === selectedChampId)
                            ?.name || selectedChampId}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>スキン</Label>
                      {canControlSettings ? (
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
                      ) : (
                        <div className="text-sm font-medium">
                          {skins.find((s) => s.id === selectedSkinId)?.name ||
                            "Default"}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Eye className="w-4 h-4" /> フィルター
                    </Label>
                    {canControlSettings ? (
                      <Select
                        value={filterType}
                        onValueChange={(v) => setFilterType(v as FilterType)}
                        disabled={isVoidMode}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">通常</SelectItem>
                          <SelectItem value="grayscale">白黒</SelectItem>
                          <SelectItem value="invert">反転</SelectItem>
                          <SelectItem value="contrast">
                            高コントラスト
                          </SelectItem>
                          <SelectItem value="void">ヴォイド</SelectItem>
                          <SelectItem value="blur">ぼかし</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm font-medium capitalize">
                        {filterType}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>難易度 (グリッド)</Label>
                    <div className="flex gap-2 flex-wrap">
                      {(isVoidMode ? [6, 8, 10] : [3, 4, 5]).map((size) => (
                        <Button
                          key={size}
                          variant={gridSize === size ? "default" : "outline"}
                          onClick={() =>
                            canControlSettings && handleGridSizeChange(size)
                          }
                          className="flex-1"
                          disabled={!canControlSettings}
                        >
                          {size}x{size}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3 void:border-primary/50 bg-card/50">
                    <div className="space-y-0.5">
                      <Label
                        className={cn(
                          "text-base flex items-center gap-2",
                          isVoidMode ? "text-primary" : ""
                        )}
                      >
                        {isVoidMode ? (
                          <Ghost className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}{" "}
                        ヴォイドモード
                      </Label>
                      <div className="text-[0.8rem] text-muted-foreground">
                        {isVoidMode ? "深淵の難易度" : "通常モード"}
                      </div>
                    </div>
                    <Switch
                      checked={isVoidMode}
                      onCheckedChange={handleVoidModeToggle}
                      disabled={!canControlSettings}
                    />
                  </div>

                  {(!isMultiplayer || multiplayerMode === "SCORE_ATTACK") && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="calc">
                        <AccordionTrigger className="text-sm">
                          スコアシステム詳細
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground text-sm">
                          <p>
                            基本スコア = (グリッドサイズ² × 1000) - (手数 × 10)
                            - (秒数 × 5)
                          </p>
                          <p className="mt-2 font-semibold">
                            ヴォイドモードボーナス:
                          </p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>
                              通常: x1.1 / 白黒: x1.2 / 高難度: x1.5 / ぼかし:
                              x1.7
                            </li>
                          </ul>
                          <p className="mt-2 text-destructive">
                            ※アシスト使用時: スコア 1% に減少 (マルチ不可)
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </CardContent>
                <CardFooter>
                  {isMultiplayer ? (
                    isHost ? (
                      <div className="w-full space-y-2">
                        <Button
                          size="lg"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={handleStartGame}
                          disabled={!canStartGame}
                        >
                          <Play className="mr-2 h-4 w-4" /> ゲームを開始する
                        </Button>
                        {!canStartGame && (
                          <p className="text-xs text-center text-destructive">
                            {playerCount < 2
                              ? "※開始するには最低2人のプレイヤーが必要です"
                              : "※参加者の準備完了を待っています"}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="w-full">
                        <Button
                          size="lg"
                          className={cn(
                            "w-full",
                            myPlayer?.isReady
                              ? "bg-secondary text-secondary-foreground"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          )}
                          onClick={handleToggleReady}
                        >
                          {myPlayer?.isReady ? "準備完了を解除" : "準備完了！"}
                        </Button>
                      </div>
                    )
                  ) : (
                    <Button
                      size="lg"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={handleStartGame}
                    >
                      <Play className="mr-2 h-4 w-4" /> ゲームスタート
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>プレビュー</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative aspect-video w-full rounded-md overflow-hidden border">
                    <img
                      src={getImageUrl}
                      className="object-cover w-full h-full"
                      style={{ filter: getFilterStyle(filterType) }}
                      alt="Preview"
                    />
                  </div>
                </CardContent>
              </Card>

              {isMultiplayer && room && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      参加者{" "}
                      <Badge variant="secondary">
                        {Object.keys(room.players).length}/8人
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px] w-full pr-4">
                      {Object.values(room.players).map((player) => (
                        <div
                          key={player.socketId}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            {player.isHost && (
                              <Badge variant="default" className="text-[10px]">
                                HOST
                              </Badge>
                            )}
                            <span className="font-medium truncate max-w-[120px]">
                              {player.name}
                            </span>
                            {mySocketId === player.socketId && (
                              <span className="text-xs text-muted-foreground">
                                (あなた)
                              </span>
                            )}
                          </div>
                          <div>
                            {!player.isHost &&
                              (player.isReady ? (
                                <Badge className="bg-green-500">READY</Badge>
                              ) : (
                                <Badge variant="outline">WAITING</Badge>
                              ))}
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {appState === "GAME" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>ステータス</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-muted rounded-lg">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">
                        手数
                      </div>
                      <div className="font-mono text-xl font-bold">{moves}</div>
                    </div>
                    <div className="p-2 bg-muted rounded-lg">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">
                        時間
                      </div>
                      <div className="font-mono text-xl font-bold">
                        {formatTime(timeElapsed)}
                      </div>
                    </div>
                    <div className="p-2 bg-muted rounded-lg">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">
                        スコア
                      </div>
                      <div className="font-mono text-xl font-bold">
                        {isTimeAttackLastOne ? "最後の1人です..." : score}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {showControlPanel && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-4 h-4" /> 操作
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!isMultiplayer && (
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label
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
                            />{" "}
                            アシスト
                          </Label>
                          <span className="text-xs text-muted-foreground">
                            次の手を表示 (スコア減少)
                          </span>
                        </div>
                        <Switch
                          checked={isAssistMode}
                          onCheckedChange={(c) => {
                            setIsAssistMode(c);
                            if (c) setHasUsedAssist(true);
                          }}
                          disabled={gridSize > 5}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label
                          className={cn("text-base flex items-center gap-2")}
                        >
                          <ImageIcon className="w-4 h-4" /> お手本
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          完成図を表示
                        </span>
                      </div>
                      <Switch
                        checked={showExample}
                        onCheckedChange={setShowExample}
                      />
                    </div>

                    {!isMultiplayer && (
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={handleResetRequest}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />{" "}
                          シャッフルしてリセット
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {showExample && !isVoidMode && (
                <div className="rounded-lg overflow-hidden border animate-in zoom-in-95 duration-200">
                  <img src={getImageUrl} className="w-full" alt="お手本" />
                </div>
              )}

              {isMultiplayer && room && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">対戦状況</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    {Object.values(room.players)
                      .sort((a, b) => b.score - a.score)
                      .map((player) => (
                        <div key={player.socketId} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span
                              className={cn(
                                "font-medium",
                                player.socketId === mySocketId && "text-primary"
                              )}
                            >
                              {player.name}{" "}
                              {player.socketId === mySocketId && "(あなた)"}
                            </span>
                            <span className="font-mono text-sm">
                              {player.finished
                                ? `FINISH! ${player.score}`
                                : `${player.score}`}
                            </span>
                          </div>
                          <Progress
                            value={player.finished ? 100 : player.progress}
                            className={cn(
                              "h-2",
                              player.finished &&
                                "bg-green-100 [&>div]:bg-green-500"
                            )}
                          />
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-8 order-1 lg:order-2 flex flex-col gap-4">
              <PuzzleBoard
                tiles={tiles}
                gridSize={gridSize}
                isSolved={isSolved}
                isPlaying={isPlaying}
                hintTileIndex={hintTileIndex}
                imageUrl={getImageUrl}
                filterType={filterType}
                onTileClick={handleTileClick}
              />
              <div className="text-center">
                <h2 className="text-2xl font-bold">
                  {champions.find((c) => c.id === selectedChampId)?.name}
                </h2>
                <p className="text-muted-foreground">
                  {champions.find((c) => c.id === selectedChampId)?.title}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <ResultDialog
        open={showSuccessDialog}
        onClose={handleCloseResult}
        isMultiplayer={isMultiplayer}
        winnerId={winnerId}
        currentSocketId={mySocketId || undefined}
        score={score}
        moves={moves}
        timeElapsed={timeElapsed}
        gridSize={gridSize}
        roomPlayers={room ? room.players : undefined}
        multiplayerMode={multiplayerMode}
        onShare={shareResult}
      />

      <Dialog
        open={alertState.open}
        onOpenChange={(o) =>
          !o && setAlertState((p) => ({ ...p, open: false }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>{alertState.title}</DialogTitle>
            </div>
            <DialogDescription>{alertState.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            {alertState.showCancel && (
              <Button
                variant="outline"
                onClick={() => setAlertState((p) => ({ ...p, open: false }))}
              >
                キャンセル
              </Button>
            )}
            <Button
              onClick={
                alertState.onAction ||
                (() => setAlertState((p) => ({ ...p, open: false })))
              }
            >
              {alertState.actionLabel || "OK"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default App;

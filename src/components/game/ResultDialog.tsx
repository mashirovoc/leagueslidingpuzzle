import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTime } from "@/lib/game-utils";
import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Crown, Trophy } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";

interface ResultDialogProps {
  open: boolean;
  onClose: () => void;
  isMultiplayer: boolean;
  winnerId: string | null;
  currentSocketId?: string;
  score: number;
  moves: number;
  timeElapsed: number;
  gridSize: number;
  roomPlayers?: { [id: string]: Player };
  multiplayerMode?: "TIME_ATTACK" | "SCORE_ATTACK";
  onShare: () => void;
}

export const ResultDialog = ({
  open,
  onClose,
  isMultiplayer,
  winnerId,
  currentSocketId,
  score,
  moves,
  timeElapsed,
  gridSize,
  roomPlayers,
  multiplayerMode,
  onShare,
}: ResultDialogProps) => {
  const getSortedPlayers = () => {
    if (!roomPlayers) return [];
    const players = Object.values(roomPlayers).filter((p) => p.finished);
    return players.sort((a, b) => {
      if (multiplayerMode === "TIME_ATTACK") {
        const timeA = a.finishTime ?? 999999;
        const timeB = b.finishTime ?? 999999;
        if (timeA === timeB) return b.score - a.score;
        return timeA - timeB;
      }
      return b.score - a.score;
    });
  };

  const sortedPlayers = isMultiplayer ? getSortedPlayers() : [];
  const myRank =
    sortedPlayers.findIndex((p) => p.socketId === currentSocketId) + 1;
  const winnerName = winnerId && roomPlayers ? roomPlayers[winnerId]?.name : "";

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md text-center void:border-primary/50">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <Trophy className="h-16 w-16 text-primary animate-bounce" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            {isMultiplayer
              ? winnerId === currentSocketId
                ? "YOU WIN!"
                : "GAME SET"
              : "クリア！"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isMultiplayer && winnerId && (
            <div className="mb-2">
              <div className="text-lg font-bold text-yellow-600 flex items-center justify-center gap-2 mb-2">
                <Crown className="w-5 h-5 fill-yellow-600" />
                1位: {winnerName}
              </div>
              <div className="bg-muted p-2 rounded-lg inline-block px-4">
                あなたの順位:{" "}
                <span className="font-bold text-lg">{myRank}</span> /{" "}
                {sortedPlayers.length}位
              </div>
            </div>
          )}

          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">YOUR SCORE</div>
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
              <span className="text-muted-foreground text-xs mb-1">サイズ</span>
              <span className="text-xl font-bold font-mono">
                {gridSize}x{gridSize}
              </span>
            </div>
          </div>

          {/* ランキングテーブル */}
          {isMultiplayer && sortedPlayers.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2 text-left">
                ランキング結果
              </h4>
              <ScrollArea className="h-[120px] w-full rounded-md border">
                <div className="p-2 space-y-1">
                  {sortedPlayers.map((p, idx) => (
                    <div
                      key={p.socketId}
                      className={cn(
                        "flex justify-between items-center text-sm p-1 rounded",
                        p.socketId === currentSocketId &&
                          "bg-primary/10 font-bold"
                      )}
                    >
                      <div className="flex gap-2">
                        <span className="w-6 text-center text-muted-foreground">
                          #{idx + 1}
                        </span>
                        <span>{p.name}</span>
                      </div>
                      <div className="flex gap-3 text-muted-foreground">
                        {multiplayerMode === "TIME_ATTACK" && (
                          <span>{formatTime(p.finishTime || 0)}</span>
                        )}
                        <span className="font-mono">{p.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            className="w-full bg-black hover:bg-zinc-800 text-white gap-2 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            onClick={onShare}
          >
            <FaXTwitter /> スコアを共有
          </Button>
          <Button variant="outline" onClick={onClose}>
            {isMultiplayer ? "ロビーに戻る" : "設定に戻る"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

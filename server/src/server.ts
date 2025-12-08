import cors from "@fastify/cors";
import Fastify from "fastify";
import fastifySocketIO from "fastify-socket.io";
import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { GameSettings, Room } from "./types";

declare module "fastify" {
  interface FastifyInstance {
    io: Server;
  }
}

const fastify = Fastify({ logger: true });

const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:3001",
];

fastify.register(cors, {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
});

fastify.register(fastifySocketIO, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true, // 必要に応じて
  },
});

const rooms: { [roomId: string]: Room } = {};

fastify.ready().then(() => {
  fastify.io.on("connection", (socket: Socket) => {
    console.log("User connected:", socket.id);

    socket.on("create_room", (data: { username?: string }) => {
      const roomId = uuidv4().substring(0, 6).toUpperCase();
      rooms[roomId] = {
        id: roomId,
        players: {
          [socket.id]: {
            socketId: socket.id,
            isHost: true,
            name: data.username || "Host",
            isReady: false,
            progress: 0,
            score: 0,
            finished: false,
          },
        },
        settings: {
          gridSize: 3,
          mode: "TIME_ATTACK",
          isVoidMode: false,
          filterType: "none",
        },
        status: "LOBBY",
        championId: "Ahri",
        skinId: "",
        seed: Math.random(),
      };
      socket.join(roomId);
      socket.emit("room_created", { roomId, room: rooms[roomId] });
    });

    socket.on("join_room", (data: { roomId: string; username?: string }) => {
      const { roomId, username } = data;
      const room = rooms[roomId];

      if (!room) {
        socket.emit("error", { message: "ルームが見つかりません" });
        return;
      }
      if (room.status !== "LOBBY") {
        socket.emit("error", { message: "ゲームは既に開始されています" });
        return;
      }
      if (Object.keys(room.players).length >= 8) {
        socket.emit("error", { message: "ルームが満員です (最大8人)" });
        return;
      }

      room.players[socket.id] = {
        socketId: socket.id,
        isHost: false,
        name: username || `Player ${Object.keys(room.players).length + 1}`,
        isReady: false,
        progress: 0,
        score: 0,
        finished: false,
      };

      socket.join(roomId);
      fastify.io.to(roomId).emit("room_update", room);
      socket.emit("joined_room", { room });
    });

    socket.on("toggle_ready", (data: { roomId: string }) => {
      const room = rooms[data.roomId];
      if (!room || !room.players[socket.id]) return;

      if (!room.players[socket.id].isHost) {
        room.players[socket.id].isReady = !room.players[socket.id].isReady;
        fastify.io.to(data.roomId).emit("room_update", room);
      }
    });

    socket.on(
      "update_settings",
      (data: {
        roomId: string;
        settings: Partial<GameSettings>;
        championId?: string;
        skinId?: string;
      }) => {
        const room = rooms[data.roomId];
        if (!room || !room.players[socket.id]?.isHost) return;

        if (data.settings) {
          room.settings = { ...room.settings, ...data.settings };
        }
        if (data.championId) room.championId = data.championId;
        if (data.skinId) room.skinId = data.skinId;

        Object.keys(room.players).forEach((pid) => {
          if (!room.players[pid].isHost) room.players[pid].isReady = false;
        });

        room.seed = Math.random();
        fastify.io.to(data.roomId).emit("room_update", room);
      }
    );

    socket.on("start_game", (data: { roomId: string }) => {
      const room = rooms[data.roomId];
      if (!room || !room.players[socket.id]?.isHost) return;

      if (Object.keys(room.players).length < 2) return;

      const allGuestsReady = Object.values(room.players)
        .filter((p) => !p.isHost)
        .every((p) => p.isReady);

      if (!allGuestsReady) return;

      room.status = "PLAYING";

      Object.keys(room.players).forEach((pid) => {
        room.players[pid].progress = 0;
        room.players[pid].score = 0;
        room.players[pid].finished = false;
        room.players[pid].finishTime = undefined;
      });

      fastify.io.to(data.roomId).emit("game_started", room);
    });

    socket.on(
      "update_progress",
      (data: {
        roomId: string;
        progress: number;
        score: number;
        moves: number;
      }) => {
        const room = rooms[data.roomId];
        if (!room || room.status !== "PLAYING") return;

        const player = room.players[socket.id];
        if (player) {
          player.progress = data.progress;
          player.score = data.score;
          socket.to(data.roomId).emit("opponent_progress", {
            socketId: socket.id,
            progress: data.progress,
            score: data.score,
          });
        }
      }
    );

    socket.on(
      "player_finished",
      (data: { roomId: string; timeElapsed: number; score: number }) => {
        const room = rooms[data.roomId];
        if (!room || room.status !== "PLAYING") return;

        const player = room.players[socket.id];
        if (player) {
          player.finished = true;
          player.finishTime = data.timeElapsed;
          player.score = data.score;

          fastify.io.to(data.roomId).emit("player_finished_notify", {
            socketId: socket.id,
            time: data.timeElapsed,
            score: data.score,
          });

          const allFinished = Object.values(room.players).every(
            (p) => p.finished
          );
          if (allFinished) {
            room.status = "FINISHED";
            fastify.io
              .to(data.roomId)
              .emit("game_over", { players: room.players });
          }
        }
      }
    );

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      for (const roomId in rooms) {
        const room = rooms[roomId];
        if (room.players[socket.id]) {
          delete room.players[socket.id];

          if (Object.keys(room.players).length === 0) {
            delete rooms[roomId];
          } else {
            fastify.io.to(roomId).emit("player_left", { socketId: socket.id });
          }
        }
      }
    });
  });
});

const start = async () => {
  try {
    const port = 3001;
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Server running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

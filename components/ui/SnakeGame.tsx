"use client";

import React from "react";

const GRID = 16;
const CELL = 18;
const TICK = 130;

type Cell = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";

const DIR_VEC: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const KEY_TO_DIR: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const INITIAL_SNAKE: Cell[] = [
  { x: 8, y: 8 },
  { x: 7, y: 8 },
  { x: 6, y: 8 },
];

function randomApple(exclude: Cell[]): Cell {
  while (true) {
    const c = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
    if (!exclude.some((e) => e.x === c.x && e.y === c.y)) return c;
  }
}

export function SnakeGame() {
  const [snake, setSnake] = React.useState<Cell[]>(INITIAL_SNAKE);
  const [apple, setApple] = React.useState<Cell>({ x: 12, y: 8 });
  const [score, setScore] = React.useState(0);
  const [state, setState] = React.useState<"idle" | "playing" | "over">("idle");

  const snakeRef = React.useRef(snake);
  const appleRef = React.useRef(apple);
  const currentDirRef = React.useRef<Dir>("right");
  const nextDirRef = React.useRef<Dir>("right");
  const stateRef = React.useRef(state);

  React.useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);
  React.useEffect(() => {
    appleRef.current = apple;
  }, [apple]);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const reset = React.useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setApple(randomApple(INITIAL_SNAKE));
    setScore(0);
    currentDirRef.current = "right";
    nextDirRef.current = "right";
    setState("idle");
  }, []);

  // Keyboard control
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const newDir = KEY_TO_DIR[e.key];
      if (!newDir) return;
      e.preventDefault();

      if (stateRef.current === "over") {
        reset();
        return;
      }
      if (stateRef.current === "idle") {
        setState("playing");
      }
      if (newDir !== OPPOSITE[currentDirRef.current]) {
        nextDirRef.current = newDir;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [reset]);

  // Game tick
  React.useEffect(() => {
    if (state !== "playing") return;
    const interval = setInterval(() => {
      const dir = nextDirRef.current;
      currentDirRef.current = dir;
      const v = DIR_VEC[dir];
      const head = snakeRef.current[0];
      const newHead = { x: head.x + v.x, y: head.y + v.y };

      // Wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID ||
        newHead.y < 0 ||
        newHead.y >= GRID
      ) {
        setState("over");
        return;
      }
      const willEat =
        newHead.x === appleRef.current.x && newHead.y === appleRef.current.y;
      const body = willEat
        ? snakeRef.current
        : snakeRef.current.slice(0, -1);
      // Self collision
      if (body.some((c) => c.x === newHead.x && c.y === newHead.y)) {
        setState("over");
        return;
      }
      const newSnake = [newHead, ...body];
      setSnake(newSnake);
      if (willEat) {
        setScore((s) => s + 1);
        setApple(randomApple(newSnake));
      }
    }, TICK);
    return () => clearInterval(interval);
  }, [state]);

  return (
    <div className="flex flex-col items-center gap-2.5 select-none">
      <div className="flex items-center justify-between w-full px-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">
          🐍 Snake
        </span>
        <span className="text-[10px] font-bold text-foreground/70 tabular-nums">
          Score · {score}
        </span>
      </div>
      <div
        className="relative bg-foreground/[0.04] border border-border rounded-lg overflow-hidden shadow-inner"
        style={{ width: GRID * CELL, height: GRID * CELL }}
      >
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: `${CELL}px ${CELL}px`,
          }}
        />

        {/* Apple */}
        <div
          className="absolute rounded-full bg-red-500"
          style={{
            left: apple.x * CELL + 3,
            top: apple.y * CELL + 3,
            width: CELL - 6,
            height: CELL - 6,
            boxShadow: "0 0 6px rgba(239, 68, 68, 0.6)",
          }}
        />

        {/* Snake */}
        {snake.map((c, i) => (
          <div
            key={`${c.x}-${c.y}-${i}`}
            className={`absolute rounded-[3px] ${i === 0 ? "bg-foreground" : "bg-foreground/85"}`}
            style={{
              left: c.x * CELL + 1,
              top: c.y * CELL + 1,
              width: CELL - 2,
              height: CELL - 2,
            }}
          />
        ))}

        {/* Idle overlay */}
        {state === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/75 backdrop-blur-sm">
            <span className="text-[11px] font-bold text-foreground">
              Snake en attendant
            </span>
            <span className="text-[10px] text-foreground/50">
              Appuie sur ↑ ↓ ← → pour jouer
            </span>
          </div>
        )}

        {/* Game over overlay */}
        {state === "over" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/85 backdrop-blur-sm">
            <span className="text-base font-extrabold text-foreground">
              Game Over
            </span>
            <span className="text-[11px] text-foreground/60">
              Score final : {score}
            </span>
            <button
              onClick={reset}
              className="mt-1 px-3 py-1 text-[10px] font-bold bg-foreground text-background rounded-md cursor-pointer active:scale-95 transition-transform"
            >
              Rejouer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

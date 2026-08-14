import {
  ActivePiece,
  BLOCK_SHAPES,
  BOARD_COLUMNS,
  BOARD_ROWS,
  BlockShapeType,
  getCells,
  getRotation,
  HIDDEN_ROWS,
  VISIBLE_ROWS,
} from './block-shapes';
import { PieceBag } from './piece-bag';

export type GameStatus = 'ready' | 'running' | 'paused' | 'game-over';
export type BoardCell = BlockShapeType | null;

export interface GameSnapshot {
  readonly board: readonly (readonly BoardCell[])[];
  readonly activePiece: ActivePiece | null;
  readonly ghostPiece: ActivePiece | null;
  readonly nextPiece: BlockShapeType;
  readonly score: number;
  readonly highScore: number;
  readonly level: number;
  readonly lines: number;
  readonly status: GameStatus;
}

const LINE_SCORES = [0, 100, 300, 500, 800] as const;

export class GameEngine {
  readonly columns = BOARD_COLUMNS;
  readonly visibleRows = VISIBLE_ROWS;
  readonly hiddenRows = HIDDEN_ROWS;
  readonly totalRows = BOARD_ROWS;

  private board: BoardCell[][] = this.createBoard();
  private bag: PieceBag;
  private activePiece: ActivePiece | null = null;
  private nextPiece: BlockShapeType;
  private scoreValue = 0;
  private highScoreValue = 0;
  private linesValue = 0;
  private statusValue: GameStatus = 'ready';

  constructor(private readonly random: () => number = Math.random) {
    this.bag = new PieceBag(this.random);
    this.nextPiece = this.bag.next();
  }

  start(): void {
    this.resetCurrentGame();
    this.statusValue = 'running';
    this.spawnPiece();
  }

  restart(): void {
    this.start();
  }

  pause(): void {
    if (this.statusValue === 'running') {
      this.statusValue = 'paused';
    }
  }

  resume(): void {
    if (this.statusValue === 'paused') {
      this.statusValue = 'running';
    }
  }

  togglePause(): void {
    if (this.statusValue === 'running') {
      this.pause();
    } else if (this.statusValue === 'paused') {
      this.resume();
    }
  }

  tick(): boolean {
    if (this.statusValue !== 'running' || this.activePiece === null) {
      return false;
    }

    if (this.tryMove(0, 1)) {
      return true;
    }

    this.lockActivePiece();
    return true;
  }

  moveLeft(): boolean {
    return this.tryMove(-1, 0);
  }

  moveRight(): boolean {
    return this.tryMove(1, 0);
  }

  softDrop(): boolean {
    const moved = this.tryMove(0, 1);
    if (moved) {
      this.addScore(1);
    }
    return moved;
  }

  hardDrop(): number {
    if (this.statusValue !== 'running' || this.activePiece === null) {
      return 0;
    }

    let distance = 0;
    while (this.tryMove(0, 1)) {
      distance += 1;
    }
    this.addScore(distance * 2);
    this.lockActivePiece();
    return distance;
  }

  rotateClockwise(): boolean {
    return this.tryRotate(1);
  }

  rotateCounterClockwise(): boolean {
    return this.tryRotate(-1);
  }

  getDropIntervalMs(): number {
    return Math.max(90, 850 - (this.levelValue - 1) * 70);
  }

  getSnapshot(): GameSnapshot {
    return {
      board: this.board.map((row) => [...row]),
      activePiece: this.activePiece === null ? null : { ...this.activePiece },
      ghostPiece: this.getGhostPiece(),
      nextPiece: this.nextPiece,
      score: this.scoreValue,
      highScore: this.highScoreValue,
      level: this.levelValue,
      lines: this.linesValue,
      status: this.statusValue,
    };
  }

  canPlace(piece: ActivePiece): boolean {
    return getCells(piece).every((cell) => {
      if (cell.x < 0 || cell.x >= BOARD_COLUMNS || cell.y >= BOARD_ROWS) {
        return false;
      }
      if (cell.y < 0) {
        return true;
      }
      return this.board[cell.y]?.[cell.x] === null;
    });
  }

  setCellForTest(x: number, y: number, value: BoardCell): void {
    this.board[y][x] = value;
  }

  private get levelValue(): number {
    return Math.floor(this.linesValue / 10) + 1;
  }

  private resetCurrentGame(): void {
    this.board = this.createBoard();
    this.bag = new PieceBag(this.random);
    this.nextPiece = this.bag.next();
    this.activePiece = null;
    this.scoreValue = 0;
    this.linesValue = 0;
  }

  private createBoard(): BoardCell[][] {
    return Array.from({ length: BOARD_ROWS }, () =>
      Array.from({ length: BOARD_COLUMNS }, () => null),
    );
  }

  private spawnPiece(): void {
    const type = this.nextPiece;
    this.nextPiece = this.bag.next();
    const piece: ActivePiece = {
      type,
      x: type === 'I' ? 3 : 3,
      y: HIDDEN_ROWS,
      rotation: 0,
    };

    if (!this.canPlace(piece)) {
      this.activePiece = piece;
      this.statusValue = 'game-over';
      this.highScoreValue = Math.max(this.highScoreValue, this.scoreValue);
      return;
    }

    this.activePiece = piece;
  }

  private tryMove(dx: number, dy: number): boolean {
    if (this.statusValue !== 'running' || this.activePiece === null) {
      return false;
    }

    const moved = { ...this.activePiece, x: this.activePiece.x + dx, y: this.activePiece.y + dy };
    if (!this.canPlace(moved)) {
      return false;
    }

    this.activePiece = moved;
    return true;
  }

  private tryRotate(direction: 1 | -1): boolean {
    if (this.statusValue !== 'running' || this.activePiece === null) {
      return false;
    }

    const rotation = getRotation(this.activePiece, direction);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      const rotated = { ...this.activePiece, rotation, x: this.activePiece.x + kick };
      if (this.canPlace(rotated)) {
        this.activePiece = rotated;
        return true;
      }
    }

    return false;
  }

  private lockActivePiece(): void {
    if (this.activePiece === null) {
      return;
    }

    for (const cell of getCells(this.activePiece)) {
      if (cell.y >= 0 && cell.y < BOARD_ROWS) {
        this.board[cell.y][cell.x] = this.activePiece.type;
      }
    }

    const cleared = this.clearFullRows();
    if (cleared > 0) {
      this.linesValue += cleared;
      this.addScore(LINE_SCORES[cleared] * this.levelValue);
    }
    this.highScoreValue = Math.max(this.highScoreValue, this.scoreValue);
    this.spawnPiece();
  }

  private clearFullRows(): number {
    const remaining = this.board.filter((row) => row.some((cell) => cell === null));
    const cleared = BOARD_ROWS - remaining.length;
    const empty = Array.from({ length: cleared }, () =>
      Array.from({ length: BOARD_COLUMNS }, () => null),
    );
    this.board = [...empty, ...remaining];
    return cleared;
  }

  private addScore(points: number): void {
    this.scoreValue += points;
    this.highScoreValue = Math.max(this.highScoreValue, this.scoreValue);
  }

  private getGhostPiece(): ActivePiece | null {
    if (this.activePiece === null) {
      return null;
    }

    let ghost = { ...this.activePiece };
    while (this.canPlace({ ...ghost, y: ghost.y + 1 })) {
      ghost = { ...ghost, y: ghost.y + 1 };
    }
    return ghost;
  }
}

export { BLOCK_SHAPES, BOARD_COLUMNS, BOARD_ROWS, HIDDEN_ROWS, VISIBLE_ROWS };

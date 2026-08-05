import { ActivePiece, BLOCK_SHAPES, BlockShapeType, getCells, HIDDEN_ROWS, VISIBLE_ROWS } from './block-shapes';
import { BoardCell, GameSnapshot } from './game-engine';

export class BoardRenderer {
  constructor(
    private readonly boardCanvas: HTMLCanvasElement,
    private readonly nextCanvas: HTMLCanvasElement,
  ) {}

  render(snapshot: GameSnapshot): void {
    this.prepareCanvas(this.boardCanvas, 300, 600);
    this.prepareCanvas(this.nextCanvas, 140, 110);

    const boardContext = this.getContext(this.boardCanvas);
    const cellSize = this.boardCanvas.width / 10 / window.devicePixelRatio;
    boardContext.clearRect(0, 0, 300, 600);
    this.drawBoardBackground(boardContext, cellSize);
    this.drawLockedCells(boardContext, snapshot.board, cellSize);

    if (snapshot.ghostPiece) {
      this.drawPiece(boardContext, snapshot.ghostPiece, cellSize, 0.25, true);
    }
    if (snapshot.activePiece) {
      this.drawPiece(boardContext, snapshot.activePiece, cellSize, 1, false);
    }

    const nextContext = this.getContext(this.nextCanvas);
    nextContext.clearRect(0, 0, 140, 110);
    this.drawPreview(nextContext, snapshot.nextPiece);
  }

  private prepareCanvas(canvas: HTMLCanvasElement, width: number, height: number): void {
    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    const context = this.getContext(canvas);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  private getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const context = canvas.getContext('2d');
    if (context === null) {
      throw new Error('Canvas 2D context is unavailable.');
    }
    return context;
  }

  private drawBoardBackground(context: CanvasRenderingContext2D, cellSize: number): void {
    context.fillStyle = this.color('--ob-board-bg', '#0a0c0d');
    context.fillRect(0, 0, 300, 600);
    context.strokeStyle = this.color('--ob-board-grid', '#202427');
    context.lineWidth = 1;
    for (let row = 0; row < VISIBLE_ROWS; row += 1) {
      for (let col = 0; col < 10; col += 1) {
        this.roundRect(context, col * cellSize + 1, row * cellSize + 1, cellSize - 2, cellSize - 2, 3);
        context.stroke();
      }
    }
  }

  private drawLockedCells(context: CanvasRenderingContext2D, board: readonly (readonly BoardCell[])[], cellSize: number): void {
    board.slice(HIDDEN_ROWS).forEach((row, visibleY) => {
      row.forEach((cell, x) => {
        if (cell !== null) {
          this.drawBlock(context, x * cellSize, visibleY * cellSize, cellSize, BLOCK_SHAPES[cell].color, 1);
        }
      });
    });
  }

  private drawPiece(context: CanvasRenderingContext2D, piece: ActivePiece, cellSize: number, alpha: number, outline: boolean): void {
    for (const cell of getCells(piece)) {
      const visibleY = cell.y - HIDDEN_ROWS;
      if (visibleY >= 0) {
        this.drawBlock(context, cell.x * cellSize, visibleY * cellSize, cellSize, BLOCK_SHAPES[piece.type].color, alpha, outline);
      }
    }
  }

  private drawPreview(context: CanvasRenderingContext2D, type: BlockShapeType): void {
    context.fillStyle = this.color('--ob-preview-bg', '#101315');
    context.fillRect(0, 0, 140, 110);
    const cells = BLOCK_SHAPES[type].rotations[0];
    const minX = Math.min(...cells.map((cell) => cell.x));
    const maxX = Math.max(...cells.map((cell) => cell.x));
    const minY = Math.min(...cells.map((cell) => cell.y));
    const maxY = Math.max(...cells.map((cell) => cell.y));
    const size = 26;
    const offsetX = (140 - (maxX - minX + 1) * size) / 2 - minX * size;
    const offsetY = (110 - (maxY - minY + 1) * size) / 2 - minY * size;

    for (const cell of cells) {
      this.drawBlock(context, offsetX + cell.x * size, offsetY + cell.y * size, size, BLOCK_SHAPES[type].color, 1);
    }
  }

  private drawBlock(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string,
    alpha: number,
    outline = false,
  ): void {
    context.save();
    context.globalAlpha = alpha;
    if (outline) {
      context.strokeStyle = color;
      context.lineWidth = 2.5;
      this.roundRect(context, x + 1, y + 1, size - 2, size - 2, 4);
      context.stroke();
      context.restore();
      return;
    }

    const inset = 2;
    this.roundRect(context, x + inset, y + inset, size - inset * 2, size - inset * 2, 4);
    context.fillStyle = color;
    context.fill();
    context.strokeStyle = 'rgba(255,255,255,0.35)';
    context.beginPath();
    context.moveTo(x + 5, y + size - 5);
    context.lineTo(x + 5, y + 5);
    context.lineTo(x + size - 5, y + 5);
    context.stroke();
    context.strokeStyle = 'rgba(0,0,0,0.35)';
    context.beginPath();
    context.moveTo(x + size - 5, y + 5);
    context.lineTo(x + size - 5, y + size - 5);
    context.lineTo(x + 5, y + size - 5);
    context.stroke();
    context.restore();
  }

  private roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
  }

  private color(variableName: string, fallback: string): string {
    const source = document.querySelector('.shell') ?? document.documentElement;
    return getComputedStyle(source).getPropertyValue(variableName).trim() || fallback;
  }
}

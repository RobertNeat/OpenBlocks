import { GameEngine } from './game-engine';

describe('GameEngine', () => {
  it('detects wall and floor collisions', () => {
    const engine = new GameEngine(() => 0);
    engine.start();

    for (let i = 0; i < 8; i += 1) {
      engine.moveLeft();
    }
    const leftEdge = engine.getSnapshot().activePiece;

    expect(leftEdge).not.toBeNull();
    expect(engine.moveLeft()).toBe(false);
    expect(engine.canPlace({ type: 'O', x: 4, y: 23, rotation: 0 })).toBe(false);
  });

  it('detects collisions with locked blocks', () => {
    const engine = new GameEngine(() => 0);
    engine.setCellForTest(4, 5, 'T');

    expect(engine.canPlace({ type: 'O', x: 3, y: 5, rotation: 0 })).toBe(false);
    expect(engine.canPlace({ type: 'O', x: 6, y: 5, rotation: 0 })).toBe(true);
  });

  it('rotates pieces in both directions', () => {
    const engine = new GameEngine(() => 0);
    engine.start();
    const before = engine.getSnapshot().activePiece;

    expect(engine.rotateClockwise()).toBe(true);
    const clockwise = engine.getSnapshot().activePiece;
    expect(clockwise?.rotation).not.toBe(before?.rotation);

    expect(engine.rotateCounterClockwise()).toBe(true);
    expect(engine.getSnapshot().activePiece?.rotation).toBe(before?.rotation);
  });

  it('spawns the active piece on the visible top of the board', () => {
    const engine = new GameEngine(() => 0);
    engine.start();

    expect(engine.getSnapshot().activePiece?.y).toBe(engine.hiddenRows);
  });

  it('clears full rows and shifts remaining rows down', () => {
    const engine = new GameEngine(() => 0);
    for (let x = 0; x < 10; x += 1) {
      engine.setCellForTest(x, 23, 'I');
    }
    engine.setCellForTest(0, 22, 'Z');

    const cleared = (engine as unknown as { clearFullRows: () => number }).clearFullRows();
    const board = engine.getSnapshot().board;

    expect(cleared).toBe(1);
    expect(board[23][0]).toBe('Z');
    expect(board[22].every((cell) => cell === null)).toBe(true);
  });

  it('adds line, soft drop, and hard drop scores', () => {
    const engine = new GameEngine(() => 0);
    engine.start();

    engine.softDrop();
    expect(engine.getSnapshot().score).toBe(1);

    const distance = engine.hardDrop();
    expect(engine.getSnapshot().score).toBe(1 + distance * 2);
  });

  it('levels up every ten cleared rows', () => {
    const engine = new GameEngine(() => 0);
    (engine as unknown as { linesValue: number }).linesValue = 9;
    for (let x = 0; x < 10; x += 1) {
      engine.setCellForTest(x, 23, 'L');
    }

    (engine as unknown as { clearFullRows: () => number }).clearFullRows();
    (engine as unknown as { linesValue: number }).linesValue += 1;

    expect(engine.getSnapshot().level).toBe(2);
  });

  it('detects game over when a new piece cannot spawn', () => {
    const engine = new GameEngine(() => 0);
    for (let x = 0; x < 10; x += 1) {
      engine.setCellForTest(x, 1, 'S');
      engine.setCellForTest(x, 2, 'S');
    }

    engine.start();
    for (let x = 0; x < 10; x += 1) {
      engine.setCellForTest(x, 4, 'S');
      engine.setCellForTest(x, 5, 'S');
    }
    (engine as unknown as { spawnPiece: () => void }).spawnPiece();

    expect(engine.getSnapshot().status).toBe('game-over');
  });
});

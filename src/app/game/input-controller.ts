import { GameEngine } from './game-engine';

const BLOCKED_SCROLL_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space']);

export class InputController {
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (BLOCKED_SCROLL_KEYS.has(event.code)) {
      event.preventDefault();
    }

    let handled = true;
    switch (event.code) {
      case 'ArrowLeft':
        this.engine.moveLeft();
        break;
      case 'ArrowRight':
        this.engine.moveRight();
        break;
      case 'ArrowDown':
        this.engine.softDrop();
        break;
      case 'ArrowUp':
      case 'KeyX':
        this.engine.rotateClockwise();
        break;
      case 'KeyZ':
        this.engine.rotateCounterClockwise();
        break;
      case 'Space':
        this.engine.hardDrop();
        break;
      case 'KeyP':
      case 'Escape':
        this.engine.togglePause();
        break;
      case 'KeyR':
        this.engine.restart();
        break;
      default:
        handled = false;
    }

    if (handled) {
      this.onChange();
    }
  };

  constructor(
    private readonly engine: GameEngine,
    private readonly onChange: () => void,
  ) {}

  connect(): void {
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
  }

  disconnect(): void {
    window.removeEventListener('keydown', this.onKeyDown);
  }
}

import { GameEngine } from './game-engine';

const BLOCKED_SCROLL_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space']);
const REPEATABLE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowDown']);
const REPEAT_DELAY_MS = 95;
const REPEAT_INTERVAL_MS = 42;

export class InputController {
  private activeRepeatKey: string | null = null;
  private repeatDelayId = 0;
  private repeatIntervalId = 0;

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (BLOCKED_SCROLL_KEYS.has(event.code)) {
      event.preventDefault();
    }

    if (event.repeat && REPEATABLE_KEYS.has(event.code)) {
      return;
    }

    const handled = this.handleKey(event.code);
    if (handled && REPEATABLE_KEYS.has(event.code)) {
      this.startRepeat(event.code);
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (event.code === this.activeRepeatKey) {
      this.stopRepeat();
    }
  };

  constructor(
    private readonly engine: GameEngine,
    private readonly onChange: () => void,
  ) {}

  connect(): void {
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.stopRepeat);
  }

  disconnect(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.stopRepeat);
    this.stopRepeat();
  }

  private handleKey(code: string): boolean {
    let handled = true;
    switch (code) {
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

    return handled;
  }

  private startRepeat(code: string): void {
    if (this.activeRepeatKey === code) {
      return;
    }

    this.stopRepeat();
    this.activeRepeatKey = code;
    this.repeatDelayId = window.setTimeout(() => {
      this.repeatIntervalId = window.setInterval(() => {
        if (this.activeRepeatKey !== null) {
          this.handleKey(this.activeRepeatKey);
        }
      }, REPEAT_INTERVAL_MS);
    }, REPEAT_DELAY_MS);
  }

  private readonly stopRepeat = (): void => {
    window.clearTimeout(this.repeatDelayId);
    window.clearInterval(this.repeatIntervalId);
    this.repeatDelayId = 0;
    this.repeatIntervalId = 0;
    this.activeRepeatKey = null;
  };
}

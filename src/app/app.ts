import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, signal } from '@angular/core';
import { BoardRenderer } from './game/board-renderer';
import { GameEngine, GameSnapshot } from './game/game-engine';
import { InputController } from './game/input-controller';

type Language = 'pl' | 'en';
type Theme = 'dark' | 'light';
type TextKey =
  | 'next'
  | 'score'
  | 'best'
  | 'lines'
  | 'level'
  | 'start'
  | 'restart'
  | 'pause'
  | 'resume'
  | 'gameOver'
  | 'ready'
  | 'running'
  | 'paused'
  | 'controls'
  | 'move'
  | 'rotate'
  | 'drop'
  | 'pressSpace'
  | 'finalScore';
type TextLabels = Record<TextKey, string>;

const TEXT: Record<Language, TextLabels> = {
  pl: {
    next: 'Nastepny',
    score: 'Wynik',
    best: 'Najlepszy w sesji',
    lines: 'Rzedy',
    level: 'Poziom',
    start: 'Start',
    restart: 'Restart',
    pause: 'Pauza',
    resume: 'Wznow',
    gameOver: 'Koniec gry',
    ready: 'Gotowe',
    running: 'Gra trwa',
    paused: 'Pauza',
    controls: 'Sterowanie',
    move: 'Ruch',
    rotate: 'Obrot',
    drop: 'Zrzut',
    pressSpace: 'Nacisnij spacje',
    finalScore: 'Wynik koncowy',
  },
  en: {
    next: 'Next',
    score: 'Score',
    best: 'Best this session',
    lines: 'Rows',
    level: 'Level',
    start: 'Start',
    restart: 'Restart',
    pause: 'Pause',
    resume: 'Resume',
    gameOver: 'Game over',
    ready: 'Ready',
    running: 'Running',
    paused: 'Paused',
    controls: 'Controls',
    move: 'Move',
    rotate: 'Rotate',
    drop: 'Drop',
    pressSpace: 'Press Space',
    finalScore: 'Final score',
  },
} as const;

@Component({
  selector: 'ob-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('boardCanvas', { static: true })
  private readonly boardCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('nextCanvas', { static: true })
  private readonly nextCanvas!: ElementRef<HTMLCanvasElement>;

  protected readonly language = signal<Language>('pl');
  protected readonly theme = signal<Theme>('dark');
  protected readonly text = signal(TEXT.pl);
  protected readonly score = signal(0);
  protected readonly highScore = signal(0);
  protected readonly lines = signal(0);
  protected readonly level = signal(1);
  protected readonly status = signal(TEXT.pl.ready);
  protected readonly scoreEffect = signal(false);

  private readonly engine = new GameEngine();
  private renderer: BoardRenderer | null = null;
  private input: InputController | null = null;
  private frameId = 0;
  private lastFrame = 0;
  private dropAccumulator = 0;
  private effectTimeoutId = 0;

  ngAfterViewInit(): void {
    this.renderer = new BoardRenderer(
      this.boardCanvas.nativeElement,
      this.nextCanvas.nativeElement,
    );
    this.input = new InputController(this.engine, () => this.syncAndRender());
    this.input.connect();
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.syncAndRender();
    this.frameId = requestAnimationFrame((time) => this.loop(time));
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.effectTimeoutId);
    this.input?.disconnect();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  protected start(): void {
    this.engine.start();
    this.dropAccumulator = 0;
    this.syncAndRender();
  }

  protected restart(): void {
    this.engine.restart();
    this.dropAccumulator = 0;
    this.syncAndRender();
  }

  protected togglePause(): void {
    this.engine.togglePause();
    this.syncAndRender();
  }

  protected setLanguage(language: Language): void {
    this.language.set(language);
    this.text.set(TEXT[language]);
    this.syncAndRender();
  }

  protected toggleLanguage(): void {
    this.setLanguage(this.language() === 'pl' ? 'en' : 'pl');
  }

  protected toggleTheme(): void {
    this.theme.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }

  protected statusClass(): string {
    return this.engine.getSnapshot().status;
  }

  protected overlayVisible(): boolean {
    return this.statusClass() !== 'running';
  }

  protected overlayTitle(): string {
    return this.status();
  }

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.engine.pause();
      this.syncAndRender();
    }
  };

  private loop(time: number): void {
    const delta = Math.min(time - this.lastFrame, 120);
    this.lastFrame = time;

    const snapshot = this.engine.getSnapshot();
    if (snapshot.status === 'running') {
      this.dropAccumulator += delta;
      if (this.dropAccumulator >= this.engine.getDropIntervalMs()) {
        this.dropAccumulator = 0;
        this.engine.tick();
        this.syncSignals(this.engine.getSnapshot());
      }
    }

    this.renderer?.render(this.engine.getSnapshot());
    this.frameId = requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  private syncAndRender(): void {
    const snapshot = this.engine.getSnapshot();
    this.syncSignals(snapshot);
    this.renderer?.render(snapshot);
  }

  private syncSignals(snapshot: GameSnapshot): void {
    const previousScore = this.score();
    const previousLines = this.lines();
    this.score.set(snapshot.score);
    this.highScore.set(snapshot.highScore);
    this.lines.set(snapshot.lines);
    this.level.set(snapshot.level);
    this.status.set(this.text()[snapshot.status === 'game-over' ? 'gameOver' : snapshot.status]);

    if (
      snapshot.score > previousScore &&
      (snapshot.score - previousScore >= 100 || snapshot.lines > previousLines)
    ) {
      this.scoreEffect.set(false);
      window.clearTimeout(this.effectTimeoutId);
      requestAnimationFrame(() => this.scoreEffect.set(true));
      this.effectTimeoutId = window.setTimeout(() => this.scoreEffect.set(false), 520);
    }
  }
}

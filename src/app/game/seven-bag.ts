import { TetrominoType } from './tetrominoes';

const TYPES: readonly TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

export class SevenBag {
  private bag: TetrominoType[] = [];

  constructor(private readonly random: () => number = Math.random) {}

  next(): TetrominoType {
    if (this.bag.length === 0) {
      this.bag = [...TYPES];
      for (let i = this.bag.length - 1; i > 0; i -= 1) {
        const j = Math.floor(this.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }

    return this.bag.shift() ?? 'I';
  }
}

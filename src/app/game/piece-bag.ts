import { BlockShapeType } from './block-shapes';

const TYPES: readonly BlockShapeType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

export class PieceBag {
  private bag: BlockShapeType[] = [];

  constructor(private readonly random: () => number = Math.random) {}

  next(): BlockShapeType {
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

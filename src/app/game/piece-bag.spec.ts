import { PieceBag } from './piece-bag';

describe('PieceBag', () => {
  it('returns every block shape exactly once before repeating the bag', () => {
    const bag = new PieceBag(() => 0.5);

    const firstBag = Array.from({ length: 7 }, () => bag.next());
    const secondBag = Array.from({ length: 7 }, () => bag.next());

    expect(new Set(firstBag)).toEqual(new Set(['I', 'J', 'L', 'O', 'S', 'T', 'Z']));
    expect(new Set(secondBag)).toEqual(new Set(['I', 'J', 'L', 'O', 'S', 'T', 'Z']));
  });
});

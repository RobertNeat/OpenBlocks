import { SevenBag } from './seven-bag';

describe('SevenBag', () => {
  it('returns every tetromino exactly once before repeating the bag', () => {
    const bag = new SevenBag(() => 0.5);

    const firstBag = Array.from({ length: 7 }, () => bag.next());
    const secondBag = Array.from({ length: 7 }, () => bag.next());

    expect(new Set(firstBag)).toEqual(new Set(['I', 'J', 'L', 'O', 'S', 'T', 'Z']));
    expect(new Set(secondBag)).toEqual(new Set(['I', 'J', 'L', 'O', 'S', 'T', 'Z']));
  });
});

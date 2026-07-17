import { describe, it, expect } from 'vitest';
import { getRandomEmoji, getEmojisByCategory, ALL_EMOJIS, FACE_EMOJIS, ANIMAL_EMOJIS, OBJECT_EMOJIS } from './emojis';

describe('emojis utility', () => {
  it('should return a random emoji from ALL_EMOJIS', () => {
    const emoji = getRandomEmoji();
    expect(emoji).toBeDefined();
    expect(typeof emoji).toBe('string');
    expect(ALL_EMOJIS).toContain(emoji);
  });

  it('should group emojis correctly by category', () => {
    const categories = getEmojisByCategory();
    expect(categories).toBeDefined();
    expect(categories.faces).toEqual(FACE_EMOJIS);
    expect(categories.animals).toEqual(ANIMAL_EMOJIS);
    expect(categories.objects).toEqual(OBJECT_EMOJIS);
  });
});

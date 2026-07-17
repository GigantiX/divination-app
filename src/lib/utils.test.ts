import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('should merge class names correctly', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('should handle conditional classes', () => {
    expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2');
  });

  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'p-4')).toBe('p-4');
  });

  it('should handle falsy values and undefined', () => {
    expect(cn('class1', null, undefined, '', 'class2')).toBe('class1 class2');
  });
});

import { describe, it, expect } from 'vitest';
import { spaceship } from '../src/spaceship';

describe('spaceship', () => {
  // Test with numbers
  it('returns -1 when first number is less than second', () => {
    expect(spaceship(1, 2)).toBe(-1);
    expect(spaceship(-10, 5)).toBe(-1);
    expect(spaceship(0, 0.1)).toBe(-1);
  });

  it('returns 1 when first number is greater than second', () => {
    expect(spaceship(2, 1)).toBe(1);
    expect(spaceship(5, -10)).toBe(1);
    expect(spaceship(0.1, 0)).toBe(1);
  });

  it('returns 0 when numbers are equal', () => {
    expect(spaceship(1, 1)).toBe(0);
    expect(spaceship(0, 0)).toBe(0);
    expect(spaceship(-5, -5)).toBe(0);
  });

  // Test with strings
  it('compares strings lexicographically', () => {
    expect(spaceship('a', 'b')).toBe(-1);
    expect(spaceship('b', 'a')).toBe(1);
    expect(spaceship('a', 'a')).toBe(0);
    expect(spaceship('abc', 'abd')).toBe(-1);
  });

  // Test with arrays
  it('compares arrays', () => {
    expect(spaceship([1, 2], [1, 3])).toBe(-1);
    expect(spaceship([1, 3], [1, 2])).toBe(1);
    expect(spaceship([1, 2], [1, 2])).toBe(0);
    expect(spaceship([1, 2, 3], [1, 2])).toBe(1); // Longer array is "greater"
  });

  // Test with mixed types (relying on JavaScript's type coercion)
  it('handles mixed type comparisons', () => {
    expect(spaceship('5', 10)).toBe(-1); // String '5' is less than number 10
    expect(spaceship(10, '5')).toBe(1);
    expect(spaceship('10', 10)).toBe(0); // String '10' equals number 10 in loose comparison
  });

  // Test with null and undefined
  it('handles null and undefined based on JavaScript comparison rules', () => {
    expect(spaceship(null, undefined)).toBe(0); // In JavaScript's comparison, null == undefined
    expect(spaceship(null, 0)).toBe(0); // Using < operator, null is not less than 0
    expect(spaceship(undefined, 0)).toBe(0); // Using < operator, undefined is not less than 0
  });

  // Test with objects
  it('compares objects according to JavaScript comparison rules', () => {
    const obj1 = { a: 1 };
    const obj2 = { a: 1 };
    const obj3 = obj1;

    // Different objects with same content are considered equal by toString representation
    expect(spaceship(obj1, obj2)).toBe(0);

    // Same object reference should be equal
    expect(spaceship(obj1, obj3)).toBe(0);
  });
});

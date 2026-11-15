import { describe, expect, it } from 'vitest';
import { pictureSize } from '../src/card/picture-size.ts';

const bytes = (...parts: (number[] | string)[]): Uint8Array =>
  new Uint8Array(parts.flatMap((part) => (typeof part === 'string' ? [...part].map((character) => character.charCodeAt(0)) : part)));
const be32 = (value: number): number[] => [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
const le16 = (value: number): number[] => [value & 255, (value >> 8) & 255];
const le24 = (value: number): number[] => [value & 255, (value >> 8) & 255, (value >> 16) & 255];
const pad = (length: number): number[] => Array.from({ length }, () => 0);

describe('reading a picture\'s size from its first bytes', () => {
  it('reads a PNG', () => {
    const png = bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a], be32(13), 'IHDR', be32(1200), be32(630), pad(8));
    expect(pictureSize(png)).toEqual({ type: 'png', width: 1200, height: 630 });
  });

  it('reads a lossy WebP', () => {
    const webp = bytes('RIFF', pad(4), 'WEBP', 'VP8 ', pad(4), pad(3), [0x9d, 0x01, 0x2a], le16(1080), le16(1920), pad(4));
    expect(pictureSize(webp)).toEqual({ type: 'webp', width: 1080, height: 1920 });
  });

  it('reads a lossless WebP', () => {
    const packed = (1000 - 1) | ((1500 - 1) << 14);
    const webp = bytes('RIFF', pad(4), 'WEBP', 'VP8L', pad(4), [0x2f], [packed & 255, (packed >> 8) & 255, (packed >> 16) & 255, (packed >>> 24) & 255], pad(8));
    expect(pictureSize(webp)).toEqual({ type: 'webp', width: 1000, height: 1500 });
  });

  it('reads an extended WebP', () => {
    const webp = bytes('RIFF', pad(4), 'WEBP', 'VP8X', pad(4), pad(4), le24(1600 - 1), le24(900 - 1), pad(4));
    expect(pictureSize(webp)).toEqual({ type: 'webp', width: 1600, height: 900 });
  });

  it('reads nothing from anything else', () => {
    expect(pictureSize(new Uint8Array())).toBeUndefined();
    expect(pictureSize(bytes('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeUndefined();
    expect(pictureSize(bytes('RIFF', pad(4), 'WAVE', pad(30)))).toBeUndefined();
    expect(pictureSize(bytes([0x89], 'PNG', pad(30)))).toBeUndefined();
  });
});

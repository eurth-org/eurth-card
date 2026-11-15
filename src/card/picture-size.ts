// The width and height a PNG or WebP file says it has, read from its first bytes. Used to check
// that every export comes out at exactly its format's size.

export interface PictureSize {
  type: 'png' | 'webp';
  width: number;
  height: number;
}

const ascii = (bytes: Uint8Array, at: number, length: number): string => String.fromCharCode(...bytes.subarray(at, at + length));
const u24 = (bytes: Uint8Array, at: number): number => (bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8) | ((bytes[at + 2] ?? 0) << 16);

/** The size of a PNG or WebP, or undefined for anything else. */
export function pictureSize(bytes: Uint8Array): PictureSize | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // PNG: an eight-byte signature, then the IHDR chunk with width and height.
  if (bytes.length >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a && ascii(bytes, 12, 4) === 'IHDR') {
    return { type: 'png', width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes.length >= 30 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    const chunk = ascii(bytes, 12, 4);
    // Extended: the canvas size, each less one, in 24 bits.
    if (chunk === 'VP8X') return { type: 'webp', width: u24(bytes, 24) + 1, height: u24(bytes, 27) + 1 };
    // Lossless: a signature byte, then 14 bits of width and 14 of height, each less one.
    if (chunk === 'VP8L' && bytes[20] === 0x2f) {
      const bits = view.getUint32(21, true);
      return { type: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    // Lossy: a start code, then 14 bits each.
    if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      return { type: 'webp', width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    }
  }
  return undefined;
}

/** (C) Pixel sizes read from file headers, so tests need no image library. */
export interface Size { width: number; height: number }

export function jpegSize(buf: Buffer): Size {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error("not a JPEG");
  for (let i = 2; i < buf.length; ) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    const isFrameHeader = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isFrameHeader) return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error("JPEG has no frame header");
}

/** The 'ispe' box: version and flags, then width and height as 32-bit integers. */
export function avifSize(buf: Buffer): Size {
  const at = buf.indexOf("ispe", 0, "latin1");
  if (at < 0) throw new Error("AVIF has no ispe box");
  return { width: buf.readUInt32BE(at + 8), height: buf.readUInt32BE(at + 12) };
}

export function webpSize(buf: Buffer): Size {
  if (buf.toString("latin1", 0, 4) !== "RIFF" || buf.toString("latin1", 8, 12) !== "WEBP") throw new Error("not a WebP");
  const chunk = buf.toString("latin1", 12, 16);
  if (chunk === "VP8X") return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  if (chunk === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  throw new Error(`unknown WebP chunk ${chunk}`);
}

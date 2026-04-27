// Browsers are little-endian for typed arrays in practice; the wire format
// matches the Uint16Array's underlying buffer byte order.

export function decodeCells(base64: string, length: number): Uint16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Uint16Array(bytes.buffer, 0, length);
}

export function encodeCells(cells: Uint16Array): string {
  const bytes = new Uint8Array(cells.buffer, cells.byteOffset, cells.byteLength);
  let binary = '';
  // Chunk to avoid String.fromCharCode argument limits on huge buffers.
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function emptyCells(width: number, height: number): Uint16Array {
  return new Uint16Array(width * height);
}

export function cellsAreEmpty(cells: Uint16Array): boolean {
  for (let i = 0; i < cells.length; i++) if (cells[i] !== 0) return false;
  return true;
}

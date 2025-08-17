const Vibrant = require('node-vibrant');
import fetch from 'node-fetch';

export async function getLogoPalette(url: string): Promise<string[]> {
  try {
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());
    const palette = await Vibrant.from(buf).getPalette();
    const hexes = Object.values(palette)
      .filter(Boolean)
      .map((s: any) => s.getHex ? s.getHex() : null)
      .filter(Boolean);
    // unique + top 3
    return Array.from(new Set(hexes)).slice(0, 3);
  } catch (error) {
    console.error('Error extracting palette:', error);
    return [];
  }
}
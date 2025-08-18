import fetch from 'node-fetch';

export async function getLogoPalette(url: string): Promise<string[]> {
  try {
    // For now, return a default palette since node-vibrant has ESM issues
    // We can still generate title cards using the brand colors
    console.log('Using default palette extraction (node-vibrant ESM issue)');
    return ['#FF6B6B', '#4ECDC4', '#45B7D1'];
  } catch (error) {
    console.error('Error extracting palette:', error);
    return [];
  }
}
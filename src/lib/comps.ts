import type { Card } from '../types';

export interface NormalizedComp {
  source: string;
  title: string;
  sold_price_cents: number;
  sold_date: string;
  sold_platform: string;
  listing_url: string;
  condition_text: string;
}

export interface SalesCompProvider {
  name: string;
  fetchRecentSales(card: Card): Promise<NormalizedComp[]>;
}

export class MockCompsProvider implements SalesCompProvider {
  name = 'mock_market';

  async fetchRecentSales(card: Card): Promise<NormalizedComp[]> {
    // Future integration point: replace with live providers (eBay/TCGPlayer/etc.).
    const seed = card.id * 97 + card.card_name.length * 13;
    const prices = [
      750 + (seed % 400),
      1200 + (seed % 550),
      1800 + (seed % 700),
      950 + (seed % 350),
      2100 + (seed % 900),
    ];

    return prices.map((price, idx) => ({
      source: this.name,
      title: `${card.card_name} ${card.set_name ?? ''} recent sale ${idx + 1}`.trim(),
      sold_price_cents: price,
      sold_date: new Date(Date.now() - idx * 86_400_000).toISOString(),
      sold_platform: idx % 2 === 0 ? 'MockBay' : 'CardHub',
      listing_url: `https://example.com/mock-comps/${card.id}/${idx + 1}`,
      condition_text: idx % 2 === 0 ? 'Near Mint' : 'Light Play',
    }));
  }
}

export function summarizeComps(prices: number[]) {
  if (!prices.length) {
    return { low_price_cents: null, average_price_cents: null, high_price_cents: null, count: 0 };
  }

  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  return {
    low_price_cents: low,
    average_price_cents: avg,
    high_price_cents: high,
    count: prices.length,
  };
}

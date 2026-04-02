import type { Env } from '../types';
import { queryOne, run } from '../lib/db';
import { notFound, ok } from '../lib/json';
import { searchPokemonCard, extractTCGPlayerPrice } from '../lib/pokemontcg';
import { fetchPriceChartingData } from '../lib/pricecharting';

interface CardRow {
  id: number;
  card_name: string;
  player_name?: string;
  set_name?: string;
  card_number?: string;
  game?: string;
  sport?: string;
  year?: number;
}

// GET /api/pricing/:cardId
// Returns TCGPlayer + PriceCharting prices for a card
export async function getCardPricing(env: Env, cardId: number): Promise<Response> {
  const card = await queryOne<CardRow>(
    env.DB,
    'SELECT * FROM cards WHERE id = ?',
    [cardId],
  );
  if (!card) return notFound('Card not found');

  const name = card.player_name || card.card_name;
  const isPokemon = (card.game || card.sport || '').toLowerCase().includes('poke') ||
                    (card.game || '').toLowerCase().includes('tcg');

  const results: Record<string, unknown> = { card_id: cardId };

  // TCGPlayer via Pokémon TCG API (Pokémon only)
  if (isPokemon && env.POKEMON_TCG_API_KEY) {
    try {
      const ptcgCard = await searchPokemonCard(
        env.POKEMON_TCG_API_KEY,
        name,
        card.card_number,
        card.set_name,
      );
      if (ptcgCard) {
        const tcgPrices = extractTCGPlayerPrice(ptcgCard);
        results.tcgplayer = tcgPrices;
        results.ptcg_id = ptcgCard.id;
        results.ptcg_set_id = ptcgCard.set.id;
        results.ptcg_set_name = ptcgCard.set.name;
        results.ptcg_series = ptcgCard.set.series;
        results.ptcg_legalities = ptcgCard.legalities;
        results.ptcg_image = ptcgCard.images?.large;
        results.tcgplayer_url = ptcgCard.tcgplayer?.url;

        // Auto-update card's set info if missing
        if (!card.set_name && ptcgCard.set?.name) {
          await run(
            env.DB,
            `UPDATE cards SET set_name = ?, external_ref = ? WHERE id = ?`,
            [ptcgCard.set.name, ptcgCard.id, cardId],
          );
        }

        // Update estimated value with TCGPlayer market price
        if (tcgPrices.market) {
          await run(
            env.DB,
            `UPDATE collection_items SET estimated_value_cents = ? WHERE card_id = ?`,
            [tcgPrices.market, cardId],
          );
        }
      }
    } catch (err) {
      console.error('TCGPlayer pricing failed:', err);
      results.tcgplayer = null;
    }
  }

  // PriceCharting (all card types)
  try {
    const pcData = await fetchPriceChartingData(name, card.set_name ?? null, card.card_number ?? null);
    results.pricecharting = pcData;
  } catch (err) {
    console.error('PriceCharting pricing failed:', err);
    results.pricecharting = null;
  }

  return ok(results);
}

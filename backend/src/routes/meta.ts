import type { Env } from '../types';
import { ok } from '../lib/json';
import { queryAll } from '../lib/db';

// Get curated meta deck templates per game
const META_DECKS: Record<string, Array<{
  name: string;
  archetype: string;
  game: string;
  format: string;
  theme: string;
  description: string;
  key_cards: string[];
  strategy: string;
}>> = {
  pokemon: [
    {
      name: 'Charizard ex / Pidgeot ex',
      archetype: 'Charizard ex',
      game: 'pokemon',
      format: 'Standard',
      theme: 'Aggro',
      description: 'Use Pidgeot ex to search for any card each turn, powering up Charizard ex for massive damage.',
      key_cards: ['Charizard ex', 'Pidgeot ex', 'Charmander', 'Charmeleon', 'Pidgey', 'Pidgeot'],
      strategy: 'aggro',
    },
    {
      name: 'Miraidon ex',
      archetype: 'Miraidon ex',
      game: 'pokemon',
      format: 'Standard',
      theme: 'Aggro',
      description: 'Fast electric deck using Miraidon ex to bench Basic Pokémon and attack immediately.',
      key_cards: ['Miraidon ex', 'Raichu V', 'Electric Generator', 'Flaaffy'],
      strategy: 'aggro',
    },
    {
      name: 'Gardevoir ex',
      archetype: 'Gardevoir ex',
      game: 'pokemon',
      format: 'Standard',
      theme: 'Control',
      description: 'Accelerate Psychic energy from hand with Gardevoir ex ability for powerful attacks.',
      key_cards: ['Gardevoir ex', 'Ralts', 'Kirlia', 'Zacian V', 'Psychic Energy'],
      strategy: 'control',
    },
    {
      name: 'Lost Box',
      archetype: 'Cramorant/Sableye',
      game: 'pokemon',
      format: 'Standard',
      theme: 'Control',
      description: 'Use the Lost Zone mechanic to power up Cramorant and Sableye for free attacks.',
      key_cards: ['Cramorant', 'Sableye', 'Comfey', 'Mirage Gate', 'Colress Machine'],
      strategy: 'control',
    },
    {
      name: 'Iron Thorns ex',
      archetype: 'Iron Thorns ex',
      game: 'pokemon',
      format: 'Standard',
      theme: 'Control',
      description: 'Ancient/Future hybrid deck using Iron Thorns ex to lock opponent out of evolving.',
      key_cards: ['Iron Thorns ex', 'Iron Valiant ex', 'Future Booster Energy'],
      strategy: 'control',
    },
    {
      name: 'Lugia VSTAR',
      archetype: 'Lugia VSTAR',
      game: 'pokemon',
      format: 'Standard',
      theme: 'Combo',
      description: 'Use Lugia VSTAR to put Colorless Pokémon from discard directly into play.',
      key_cards: ['Lugia VSTAR', 'Lugia V', 'Archeops', 'Yveltal'],
      strategy: 'combo',
    },
  ],
  magic: [
    {
      name: 'Domain Ramp',
      archetype: 'Domain',
      game: 'magic',
      format: 'Standard',
      theme: 'Control',
      description: 'Collect all basic land types to power up Domain spells for massive value.',
      key_cards: ['Atraxa, Grand Unifier', 'Sunfall', 'Up the Beanstalk', 'Sunlance'],
      strategy: 'control',
    },
    {
      name: 'Esper Midrange',
      archetype: 'Esper',
      game: 'magic',
      format: 'Standard',
      theme: 'Midrange',
      description: 'Blue/White/Black midrange using powerful planeswalkers and removal.',
      key_cards: ['The Wandering Emperor', 'Raffine', 'Teferi'],
      strategy: 'midrange',
    },
    {
      name: 'Mono Red Aggro',
      archetype: 'Mono Red',
      game: 'magic',
      format: 'Standard',
      theme: 'Aggro',
      description: 'Fast red creatures and burn spells to end games quickly.',
      key_cards: ['Monastery Swiftspear', 'Light Up the Stage', 'Goblin Guide'],
      strategy: 'aggro',
    },
  ],
  yugioh: [
    {
      name: 'Snake-Eye Fire',
      archetype: 'Snake-Eye',
      game: 'yugioh',
      format: 'Advanced',
      theme: 'Combo',
      description: 'FIRE attribute combo deck using Snake-Eye monsters for explosive plays.',
      key_cards: ['Snake-Eye Ash', 'Snake-Eye Oak', 'Diabellstar the Black Witch'],
      strategy: 'combo',
    },
    {
      name: 'Tenpai Dragon',
      archetype: 'Tenpai',
      game: 'yugioh',
      format: 'Advanced',
      theme: 'Aggro',
      description: 'Aggressive dragon deck focused on direct attacks and synchro summoning.',
      key_cards: ['Tenpai Dragon Chundra', 'Tenpai Dragon Paidra'],
      strategy: 'aggro',
    },
  ],
  lorcana: [
    {
      name: 'Amber/Amethyst Control',
      archetype: 'Control',
      game: 'lorcana',
      format: 'Standard',
      theme: 'Control',
      description: 'Use Amber and Amethyst ink for powerful singing and control effects.',
      key_cards: ['Ariel', 'Elsa', 'Be Our Guest'],
      strategy: 'control',
    },
  ],
  onepiece: [
    {
      name: 'Red Luffy Aggro',
      archetype: 'Red Luffy',
      game: 'onepiece',
      format: 'Standard',
      theme: 'Aggro',
      description: 'Fast Luffy-based deck using Red cards for aggressive attacks.',
      key_cards: ['Monkey D. Luffy', 'Gear 5'],
      strategy: 'aggro',
    },
  ],
};

// GET /api/meta/:game
export async function getMetaDecks(env: Env, game: string): Promise<Response> {
  const decks = META_DECKS[game.toLowerCase()] ?? [];
  return ok({ game, decks });
}

// POST /api/deck/analyze
// Given a user's collection and a meta deck, show have/need analysis
export async function analyzeDeckAgainstCollection(
  env: Env,
  request: Request,
  userId: number,
): Promise<Response> {
  const body = await request.json() as {
    key_cards: string[];
    game: string;
    deck_size: number;
  };

  // Get user's collection for this game
  const collection = await queryAll<{
    id: number;
    card_name: string;
    player_name: string;
    card_id: number;
    game: string;
    sport: string;
    set_name: string;
    estimated_value_cents: number;
    front_image_url: string;
    bbox_x: number;
    bbox_y: number;
    bbox_width: number;
    bbox_height: number;
  }>(
    env.DB,
    `SELECT ci.id, ci.card_id, ci.estimated_value_cents,
            ci.front_image_url, ci.bbox_x, ci.bbox_y, ci.bbox_width, ci.bbox_height,
            c.card_name, c.player_name, c.game, c.sport, c.set_name
     FROM collection_items ci
     JOIN cards c ON ci.card_id = c.id
     WHERE ci.user_id = ?`,
    [userId],
  );

  const haveCards: typeof collection = [];
  const needCards: string[] = [];

  for (const keyCard of body.key_cards) {
    const found = collection.find(c => {
      const name = (c.player_name || c.card_name || '').toLowerCase();
      return name.includes(keyCard.toLowerCase()) ||
             keyCard.toLowerCase().includes(name);
    });

    if (found) {
      haveCards.push(found);
    } else {
      needCards.push(keyCard);
    }
  }

  const completionPct = body.key_cards.length > 0
    ? Math.round((haveCards.length / body.key_cards.length) * 100)
    : 0;

  return ok({
    have: haveCards,
    need: needCards,
    completion_pct: completionPct,
    have_count: haveCards.length,
    need_count: needCards.length,
    total_key_cards: body.key_cards.length,
  });
}

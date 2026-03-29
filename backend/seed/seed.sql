-- Optional seed data for quick MVP testing.

INSERT INTO cards (game, set_name, card_name, card_number, rarity, image_url, external_ref)
VALUES
  ('Pokemon', 'Scarlet & Violet', 'Pikachu ex', '063/198', 'Ultra Rare', NULL, 'pkm-sv-pikachu-ex'),
  ('Pokemon', '151', 'Charizard ex', '006/165', 'Special Illustration Rare', NULL, 'pkm-151-charizard-ex'),
  ('Pokemon', 'Crown Zenith', 'Mewtwo VSTAR', 'GG44/GG70', 'Galarian Gallery', NULL, 'pkm-cz-mewtwo-vstar');

INSERT INTO releases (game, release_name, product_type, release_date, source_url)
VALUES
  ('Pokemon', 'Pokemon TCG: Journey Together Booster Box', 'Booster Box', '2026-05-15', 'https://www.pokemon.com'),
  ('Pokemon', 'Pokemon TCG: Journey Together Elite Trainer Box', 'Elite Trainer Box', '2026-05-15', 'https://www.pokemon.com'),
  ('Pokemon', 'Pokemon TCG: Prismatic Clash Premium Collection', 'Collection Box', '2026-07-10', 'https://www.pokemon.com');

INSERT INTO sales_comps (card_id, source, title, sold_price_cents, sold_date, sold_platform, listing_url, condition_text)
VALUES
  (1, 'seed_mock', 'Pikachu ex NM', 1299, '2026-03-01T00:00:00Z', 'MockBay', 'https://example.com/seed/pikachu-1', 'Near Mint'),
  (1, 'seed_mock', 'Pikachu ex LP', 999, '2026-03-04T00:00:00Z', 'CardHub', 'https://example.com/seed/pikachu-2', 'Light Play'),
  (2, 'seed_mock', 'Charizard ex SIR', 5999, '2026-03-02T00:00:00Z', 'MockBay', 'https://example.com/seed/charizard-1', 'Near Mint');

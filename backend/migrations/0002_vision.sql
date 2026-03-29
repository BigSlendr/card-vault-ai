-- Migration: 0002_vision
-- Adds the pending_identifications table used by the Claude Vision pipeline.
-- Each row records the raw AI identification suggestions for a collection item
-- and tracks whether the user has confirmed (accepted) them.

CREATE TABLE IF NOT EXISTS pending_identifications (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_item_id  INTEGER NOT NULL,
  suggestions         TEXT    NOT NULL, -- JSON-encoded CardIdentification
  confirmed           INTEGER NOT NULL DEFAULT 0 CHECK (confirmed IN (0, 1)),
  created_at          TEXT    NOT NULL DEFAULT (CURRENT_TIMESTAMP),

  FOREIGN KEY (collection_item_id)
    REFERENCES collection_items (id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pending_ident_item
  ON pending_identifications (collection_item_id, confirmed, created_at DESC);

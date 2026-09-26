-- B-T-B-N Web portfolio CMS — projects table.
--
-- Image columns hold URLs/paths only, never binary data. Today they carry local
-- asset paths (/previews/…) or absolute external URLs; when R2 is introduced later
-- the same columns take the R2 public URL with no schema change.

CREATE TABLE IF NOT EXISTS projects (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  slug               TEXT    NOT NULL UNIQUE,
  title              TEXT    NOT NULL,
  category           TEXT    NOT NULL,
  project_type       TEXT    NOT NULL DEFAULT 'concept'
                       CHECK (project_type IN ('production', 'fullstack', 'landing', 'concept')),
  status             TEXT    NOT NULL DEFAULT 'Concept Project',
  year               TEXT    NOT NULL DEFAULT '',
  role               TEXT    NOT NULL DEFAULT '',
  headline           TEXT    NOT NULL DEFAULT '',
  short_description  TEXT    NOT NULL DEFAULT '',
  domain             TEXT    NOT NULL DEFAULT '',
  scope              TEXT    NOT NULL DEFAULT '',
  accent             TEXT    NOT NULL DEFAULT 'citiled',

  -- JSON-encoded arrays (D1 has no array type).
  tech_stack         TEXT    NOT NULL DEFAULT '[]',
  filters            TEXT    NOT NULL DEFAULT '[]',
  scenes             TEXT    NOT NULL DEFAULT '[]',
  features           TEXT    NOT NULL DEFAULT '[]',

  -- Case study narrative. All optional.
  goal               TEXT    NOT NULL DEFAULT '',
  overview           TEXT    NOT NULL DEFAULT '',
  problem            TEXT    NOT NULL DEFAULT '',
  solution           TEXT    NOT NULL DEFAULT '',
  design_approach    TEXT    NOT NULL DEFAULT '',
  development_details TEXT   NOT NULL DEFAULT '',
  challenges         TEXT    NOT NULL DEFAULT '',
  resolution         TEXT    NOT NULL DEFAULT '',
  result             TEXT    NOT NULL DEFAULT '',

  -- URLs (validated server-side; empty string means "not set").
  live_url           TEXT    NOT NULL DEFAULT '',
  live_label         TEXT    NOT NULL DEFAULT '',
  github_url         TEXT    NOT NULL DEFAULT '',

  -- Image locations. Paths or URLs only — never blobs.
  cover_image        TEXT    NOT NULL DEFAULT '',
  desktop_image      TEXT    NOT NULL DEFAULT '',
  mobile_image       TEXT    NOT NULL DEFAULT '',
  detail_image       TEXT    NOT NULL DEFAULT '',

  featured           INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  sort_order         INTEGER NOT NULL DEFAULT 0,
  is_published       INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),

  created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Public listing reads published rows in display order.
CREATE INDEX IF NOT EXISTS idx_projects_public ON projects (is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects (updated_at DESC);

-- Keep updated_at honest without every caller remembering to set it.
CREATE TRIGGER IF NOT EXISTS trg_projects_updated_at
AFTER UPDATE ON projects
FOR EACH ROW
BEGIN
  UPDATE projects SET updated_at = datetime('now') WHERE id = OLD.id;
END;

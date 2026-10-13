-- BrandFoundry core schema. Written to stay portable to PostgreSQL (TEXT ids, ISO timestamps,
-- JSON stored as TEXT here and JSONB in Postgres).

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE,
  password_hash TEXT,
  display_name  TEXT NOT NULL DEFAULT '',
  is_guest      INTEGER NOT NULL DEFAULT 0 CHECK (is_guest IN (0, 1)),
  created_at    TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL,
  CHECK (is_guest = 1 OR (email IS NOT NULL AND password_hash IS NOT NULL))
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE projects (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  is_demo    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX projects_user_updated ON projects(user_id, updated_at DESC);

-- One row per workflow artifact per project; content lives in versions.
CREATE TABLE artifacts (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL CHECK (kind IN ('brief','research','positioning','voice','naming','identity','challenge','consistency')),
  current_version  INTEGER NOT NULL,
  approved_version INTEGER,
  revision         INTEGER NOT NULL DEFAULT 1,
  stale_reason     TEXT,
  updated_at       TEXT NOT NULL,
  UNIQUE (project_id, kind)
);

CREATE TABLE artifact_versions (
  id          TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  data        TEXT NOT NULL,
  provenance  TEXT NOT NULL,
  created_by  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  UNIQUE (artifact_id, version)
);

-- Recorded edges: which upstream version a downstream version was built from.
CREATE TABLE artifact_dependencies (
  version_id       TEXT NOT NULL REFERENCES artifact_versions(id) ON DELETE CASCADE,
  upstream_kind    TEXT NOT NULL,
  upstream_version INTEGER NOT NULL,
  PRIMARY KEY (version_id, upstream_kind)
);

CREATE TABLE competitors (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  url             TEXT NOT NULL DEFAULT '',
  positioning     TEXT NOT NULL DEFAULT '',
  audience        TEXT NOT NULL DEFAULT '',
  messaging       TEXT NOT NULL DEFAULT '',
  differentiation TEXT NOT NULL DEFAULT '',
  visual_notes    TEXT NOT NULL DEFAULT '',
  notes           TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL
);
CREATE INDEX competitors_project ON competitors(project_id);

CREATE TABLE research_sources (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  competitor_id TEXT REFERENCES competitors(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  title         TEXT NOT NULL DEFAULT '',
  excerpt       TEXT NOT NULL DEFAULT '',
  added_by      TEXT NOT NULL DEFAULT 'user' CHECK (added_by IN ('user')),
  created_at    TEXT NOT NULL
);
CREATE INDEX sources_project ON research_sources(project_id);

CREATE TABLE naming_candidates (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  style          TEXT NOT NULL,
  rationale      TEXT NOT NULL DEFAULT '',
  pronunciation  TEXT NOT NULL DEFAULT '',
  drawbacks      TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','shortlisted','rejected')),
  favorite       INTEGER NOT NULL DEFAULT 0,
  rejection_note TEXT NOT NULL DEFAULT '',
  source         TEXT NOT NULL CHECK (source IN ('ai','user')),
  created_at     TEXT NOT NULL,
  UNIQUE (project_id, name)
);

CREATE TABLE validation_findings (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source     TEXT NOT NULL CHECK (source IN ('rule','ai')),
  rule_id    TEXT,
  severity   TEXT NOT NULL CHECK (severity IN ('high','medium','low')),
  title      TEXT NOT NULL,
  detail     TEXT NOT NULL,
  artifacts  TEXT NOT NULL DEFAULT '[]',
  resolution TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  created_at TEXT NOT NULL
);
CREATE INDEX findings_project ON validation_findings(project_id, status);

CREATE TABLE activity_events (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX activity_user_created ON activity_events(user_id, created_at DESC);

CREATE TABLE ai_usage (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    TEXT REFERENCES projects(id) ON DELETE SET NULL,
  task          TEXT NOT NULL,
  model         TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('ok','error','invalid','refused')),
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  error         TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX ai_usage_user_created ON ai_usage(user_id, created_at DESC);

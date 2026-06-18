-- =============================================================================
-- Social Media Dashboard — Database Schema
-- =============================================================================
-- This script runs on first container start via Docker's docker-entrypoint-initdb.d.
-- It is idempotent: uses CREATE TABLE IF NOT EXISTS and safe defaults.
-- =============================================================================

-- Enable uuid-ossp for UUID generation (fallback for older PostgreSQL versions).
-- In PG 13+, gen_random_uuid() is built-in; this extension provides compatibility.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. users — Mock authentication for the dashboard admin
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(50)     UNIQUE NOT NULL,
    password_hash   VARCHAR(255)    NOT NULL,
    display_name    VARCHAR(100)    NOT NULL DEFAULT 'Admin',
    email           VARCHAR(255)    UNIQUE NOT NULL,
    avatar          TEXT,
    role            VARCHAR(20)     DEFAULT 'admin',
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE  users              IS 'Dashboard users for mock JWT authentication';
COMMENT ON COLUMN users.username     IS 'Unique login username. Seed: admin';
COMMENT ON COLUMN users.password_hash IS 'bcrypt hash of the user password';
COMMENT ON COLUMN users.role         IS 'User role for authorization checks';

-- =============================================================================
-- 2. posts — Social media posts (draft, scheduled, published, failed)
--    Maps to the Post interface in shared/types.ts
-- =============================================================================
CREATE TABLE IF NOT EXISTS posts (
    id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    platform          VARCHAR(20)     NOT NULL
                        CHECK (platform IN ('twitter', 'instagram', 'linkedin')),
    content           TEXT            NOT NULL
                        CHECK (char_length(content) > 0),
    media_url         TEXT,                             -- URL to attached media/image
    status            VARCHAR(20)     DEFAULT 'draft'
                        CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
    scheduled_at      TIMESTAMPTZ,                      -- nullable: only for scheduled posts
    published_at      TIMESTAMPTZ,                      -- nullable: set when post is published
    engagement_score  INTEGER         DEFAULT 0
                        CHECK (engagement_score >= 0 AND engagement_score <= 1000),
    likes             INTEGER         DEFAULT 0,
    shares            INTEGER         DEFAULT 0,
    comments          INTEGER         DEFAULT 0,
    created_by        UUID            REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ     DEFAULT NOW(),
    updated_at        TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE  posts                   IS 'Social media posts across Twitter, Instagram, LinkedIn';
COMMENT ON COLUMN posts.platform          IS 'Target social media platform';
COMMENT ON COLUMN posts.content           IS 'Post body text. Twitter posts should be ≤280 chars';
COMMENT ON COLUMN posts.media_url         IS 'URL to attached media/image (nullable)';
COMMENT ON COLUMN posts.status            IS 'Lifecycle status of the post';
COMMENT ON COLUMN posts.scheduled_at      IS 'When the post is scheduled to go live (nullable)';
COMMENT ON COLUMN posts.published_at      IS 'When the post was actually published (nullable)';
COMMENT ON COLUMN posts.engagement_score  IS 'Aggregate engagement score (0–1000)';
COMMENT ON COLUMN posts.created_by        IS 'FK to the user who created the post';

-- Indexes for posts: platform/status filtering, schedule calendar queries
CREATE INDEX IF NOT EXISTS idx_posts_platform_status  ON posts(platform, status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at     ON posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_created_by       ON posts(created_by);

-- =============================================================================
-- 3. metric_snapshots — Time-series KPIs per platform (followers, engagement, etc.)
--    Maps to MetricSnapshot in shared/types.ts
-- =============================================================================
CREATE TABLE IF NOT EXISTS metric_snapshots (
    id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    platform          VARCHAR(20)     NOT NULL
                        CHECK (platform IN ('twitter', 'instagram', 'linkedin')),
    followers         INTEGER         NOT NULL,
    engagement        DECIMAL(5,2)    NOT NULL,         -- engagement rate as percentage (e.g. 3.42)
    impressions       INTEGER         NOT NULL,
    likes             INTEGER         NOT NULL,
    shares            INTEGER         NOT NULL,
    comments          INTEGER         NOT NULL,
    timestamp         TIMESTAMPTZ     NOT NULL,          -- the time this snapshot represents
    created_at        TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE  metric_snapshots              IS 'Daily metric snapshots for time-series dashboard queries';
COMMENT ON COLUMN metric_snapshots.platform     IS 'Social media platform';
COMMENT ON COLUMN metric_snapshots.followers    IS 'Total follower/subscriber count at snapshot time';
COMMENT ON COLUMN metric_snapshots.engagement IS 'Engagement rate as percentage (e.g. 3.42)';
COMMENT ON COLUMN metric_snapshots.impressions  IS 'Total impressions in the period';
COMMENT ON COLUMN metric_snapshots.timestamp IS 'Timestamp of the metric snapshot (indexed for time-series)';

-- Indexes for time-series dashboard queries and date-range filtering
CREATE INDEX IF NOT EXISTS idx_metric_snapshots_platform_time
    ON metric_snapshots(platform, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metric_snapshots_timestamp
    ON metric_snapshots(timestamp DESC);

-- =============================================================================
-- 4. audience_insights — Demographic breakdowns per platform per day
--    Maps to AudienceInsights in shared/types.ts (raw data storage)
-- =============================================================================
CREATE TABLE IF NOT EXISTS audience_insights (
    id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    platform              VARCHAR(20)     NOT NULL
                            CHECK (platform IN ('twitter', 'instagram', 'linkedin')),
    age_group             VARCHAR(20),                             -- e.g. '18-24', '25-34', '35-44', '45+'
    percentage            DECIMAL(5,2)    NOT NULL,                -- percentage of audience in this age group
    active_hour           INTEGER,                                 -- 0–23, peak activity hour
    active_hour_percentage DECIMAL(5,2),                           -- percentage of activity at peak hour
    top_location          VARCHAR(100),                            -- most common location for this segment
    snapshot_date         DATE            DEFAULT CURRENT_DATE
);

COMMENT ON TABLE  audience_insights              IS 'Audience demographic data per platform';
COMMENT ON COLUMN audience_insights.age_group    IS 'Age demographic label (e.g. 18-24)';
COMMENT ON COLUMN audience_insights.percentage   IS 'Percentage of total audience in this age group';
COMMENT ON COLUMN audience_insights.active_hour  IS 'Peak activity hour (0-23) for this platform';
COMMENT ON COLUMN audience_insights.snapshot_date IS 'Date this insight was captured';

-- Index for platform/dashboard queries
CREATE INDEX IF NOT EXISTS idx_audience_insights_platform_date
    ON audience_insights(platform, snapshot_date DESC);

-- =============================================================================
-- Social Media Dashboard — Seed Data
-- =============================================================================
-- This script runs after init.sql via Docker's docker-entrypoint-initdb.d.
-- It is idempotent: uses TRUNCATE before INSERT so it can be re-run safely.
-- =============================================================================

-- Clear existing data before inserting (CASCADE handles FK references).
TRUNCATE TABLE users, posts, metric_snapshots, audience_insights RESTART IDENTITY CASCADE;

-- =============================================================================
-- 1. USERS
-- =============================================================================
-- Admin user for mock JWT authentication.
-- Password: "password123" (bcrypt hash with cost 10)
INSERT INTO users (username, password_hash, display_name, email, role) VALUES
    ('admin', '$2b$10$ttt5umcu.70L2tm2F0gsDeSDvVgn4dT2nvmj0yFzx4.J0nk3.hK.O', 'Admin', 'admin@smm.local', 'admin');

-- =============================================================================
-- 2. POSTS
-- =============================================================================
-- We use the admin user's id for all created_by references.
-- The subquery (SELECT id FROM users WHERE username = 'admin') is used for portability.

-- 2a. PUBLISHED TWEETS (3 posts, engagement 45–90, ~2 weeks ago)
INSERT INTO posts (platform, content, status, published_at, engagement_score, likes, shares, comments, created_by) VALUES
(
    'twitter',
    'Excited to announce our new feature launch! 🚀 Our team has worked tirelessly to bring this to you. Check it out! #TechNews',
    'published',
    NOW() - INTERVAL '14 days',
    78, 142, 53, 28,
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'twitter',
    'Great insights from today''s social media marketing conference. AI is truly transforming how we connect with audiences. 🤖 #SocialMedia',
    'published',
    NOW() - INTERVAL '12 days',
    45, 89, 31, 15,
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'twitter',
    '10K followers! 🎉 Thank you all for the incredible support. This community never ceases to amaze me. 🙏 #Gratitude',
    'published',
    NOW() - INTERVAL '9 days',
    90, 215, 78, 42,
    (SELECT id FROM users WHERE username = 'admin')
);

-- 2b. PUBLISHED INSTAGRAM POSTS (4 posts, engagement 120–350)
INSERT INTO posts (platform, content, status, published_at, engagement_score, likes, shares, comments, created_by) VALUES
(
    'instagram',
    'Behind the scenes of our latest photoshoot! The creative energy was absolutely electric. 📸✨',
    'published',
    NOW() - INTERVAL '13 days',
    350, 1280, 234, 89,
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'instagram',
    'New product drop alert! Swipe to see our latest collection. Which one is your favorite? 🛍️❤️',
    'published',
    NOW() - INTERVAL '10 days',
    240, 950, 187, 65,
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'instagram',
    'Golden hour magic at the team retreat. Sometimes the best ideas come when you''re away from the desk. 🌅',
    'published',
    NOW() - INTERVAL '7 days',
    120, 520, 98, 34,
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'instagram',
    'Weekend vibes with the team! Nothing beats good company and great coffee. ☕🤝',
    'published',
    NOW() - INTERVAL '5 days',
    180, 740, 156, 47,
    (SELECT id FROM users WHERE username = 'admin')
);

-- 2c. PUBLISHED LINKEDIN POSTS (2 posts, engagement 35–60)
INSERT INTO posts (platform, content, status, published_at, engagement_score, likes, shares, comments, created_by) VALUES
(
    'linkedin',
    'Thrilled to share that we''ve been recognized as one of the top 50 innovative companies in 2026. A huge milestone for our entire team.',
    'published',
    NOW() - INTERVAL '11 days',
    60, 185, 42, 23,
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'linkedin',
    'Key takeaways from this month''s industry webinar: 1) Data-driven decisions 2) Community-first approach 3) Sustainable growth. What would you add?',
    'published',
    NOW() - INTERVAL '6 days',
    35, 98, 21, 14,
    (SELECT id FROM users WHERE username = 'admin')
);

-- 2d. SCHEDULED POSTS (2 posts — future dates)
INSERT INTO posts (platform, content, status, scheduled_at, created_by) VALUES
(
    'twitter',
    'We''re going LIVE tomorrow at 2 PM EST for a special product reveal. Set those reminders! 🔔 #ComingSoon',
    'scheduled',
    NOW() + INTERVAL '1 day',
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'instagram',
    'Save the date! Our summer collection launches next Monday. Here''s a little sneak peek... 🌞✨',
    'scheduled',
    NOW() + INTERVAL '7 days',
    (SELECT id FROM users WHERE username = 'admin')
);

-- 2e. DRAFT POSTS (2 posts)
INSERT INTO posts (platform, content, status, created_by) VALUES
(
    'twitter',
    'Just finished reading an amazing book on product design. Highly recommend for anyone in tech. 📚',
    'draft',
    (SELECT id FROM users WHERE username = 'admin')
),
(
    'instagram',
    'Throwback to last year''s summer campaign. Can you believe how much has changed? 📸',
    'draft',
    (SELECT id FROM users WHERE username = 'admin')
);

-- 2f. FAILED POST (1 post, for edge case coverage)
INSERT INTO posts (platform, content, status, published_at, engagement_score, likes, shares, comments, created_by) VALUES
(
    'twitter',
    'This post failed to publish due to a media upload error. Re-attempting shortly.',
    'failed',
    NOW() - INTERVAL '3 days',
    0, 0, 0, 0,
    (SELECT id FROM users WHERE username = 'admin')
);

-- =============================================================================
-- 3. METRIC SNAPSHOTS — 14 days of time-series data per platform
-- =============================================================================
-- Each platform gets one snapshot per day for the past 14 days.
-- Follower counts vary slightly per day to simulate organic growth.

-- Helper: we generate rows for days 0 through 13 (14 days total)

-- 3a. TWITTER — followers ~15000 with daily fluctuations
INSERT INTO metric_snapshots (platform, followers, engagement, impressions, likes, shares, comments, timestamp)
SELECT
    'twitter',
    14850 + (random() * 300)::int + (d * 12)::int,
    2.5 + (random() * 1.0),
    85000 + (random() * 15000)::int + (CASE WHEN d = 3 THEN 12000 WHEN d = 8 THEN -8000 ELSE 0 END),
    1200 + (random() * 800)::int,
    350 + (random() * 250)::int,
    180 + (random() * 120)::int,
    NOW() - (d || ' days')::INTERVAL
FROM generate_series(0, 13) AS d;

-- 3b. INSTAGRAM — followers ~28000 with daily fluctuations
INSERT INTO metric_snapshots (platform, followers, engagement, impressions, likes, shares, comments, timestamp)
SELECT
    'instagram',
    27800 + (random() * 500)::int + (d * 20)::int,
    4.0 + (random() * 2.0),
    140000 + (random() * 30000)::int + (CASE WHEN d = 5 THEN 25000 WHEN d = 10 THEN -15000 ELSE 0 END),
    3500 + (random() * 2000)::int,
    900 + (random() * 500)::int,
    450 + (random() * 300)::int,
    NOW() - (d || ' days')::INTERVAL
FROM generate_series(0, 13) AS d;

-- 3c. LINKEDIN — followers ~8000 with daily fluctuations
INSERT INTO metric_snapshots (platform, followers, engagement, impressions, likes, shares, comments, timestamp)
SELECT
    'linkedin',
    7800 + (random() * 300)::int + (d * 8)::int,
    1.0 + (random() * 0.5),
    42000 + (random() * 10000)::int + (CASE WHEN d = 7 THEN 8000 WHEN d = 12 THEN -5000 ELSE 0 END),
    600 + (random() * 400)::int,
    120 + (random() * 100)::int,
    80 + (random() * 60)::int,
    NOW() - (d || ' days')::INTERVAL
FROM generate_series(0, 13) AS d;

-- =============================================================================
-- 4. AUDIENCE INSIGHTS — Demographics per platform (3 rows each, 9 total)
-- =============================================================================

-- 4a. TWITTER — skews slightly younger, tech-oriented
INSERT INTO audience_insights (platform, age_group, percentage, active_hour, active_hour_percentage, top_location, snapshot_date) VALUES
    ('twitter', '18-24', 30.00, 20, 18.5, 'New York, USA', CURRENT_DATE),
    ('twitter', '25-34', 45.00, 20, 18.5, 'San Francisco, USA', CURRENT_DATE),
    ('twitter', '35-44', 25.00, 20, 18.5, 'London, UK', CURRENT_DATE);

-- 4b. INSTAGRAM — skews youngest
INSERT INTO audience_insights (platform, age_group, percentage, active_hour, active_hour_percentage, top_location, snapshot_date) VALUES
    ('instagram', '18-24', 40.00, 21, 22.0, 'Los Angeles, USA', CURRENT_DATE),
    ('instagram', '25-34', 45.00, 21, 22.0, 'New York, USA', CURRENT_DATE),
    ('instagram', '35-44', 15.00, 21, 22.0, 'Miami, USA', CURRENT_DATE);

-- 4c. LINKEDIN — skews older, professional
INSERT INTO audience_insights (platform, age_group, percentage, active_hour, active_hour_percentage, top_location, snapshot_date) VALUES
    ('linkedin', '18-24', 15.00, 8, 14.0, 'New York, USA', CURRENT_DATE),
    ('linkedin', '25-34', 45.00, 8, 14.0, 'San Francisco, USA', CURRENT_DATE),
    ('linkedin', '35-44', 40.00, 8, 14.0, 'Chicago, USA', CURRENT_DATE);

-- Persist meals per day on each planner entry (used for scaling and profile-update refresh)
ALTER TABLE meal_plan_entries
    ADD COLUMN meals_per_day INT NOT NULL DEFAULT 3;

-- Standalone profiles: no link to users table
ALTER TABLE user_profiles
    DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

ALTER TABLE user_profiles
    DROP COLUMN IF EXISTS user_id;

DROP TABLE IF EXISTS users;

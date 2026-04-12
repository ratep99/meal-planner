CREATE TABLE meal_plan_days (
    id           BIGSERIAL PRIMARY KEY,
    meal_plan_id BIGINT NOT NULL REFERENCES meal_plans (id) ON DELETE CASCADE,
    day_number   INT    NOT NULL,
    UNIQUE (meal_plan_id, day_number)
);

CREATE TABLE meal_plan_entries (
    id                 BIGSERIAL PRIMARY KEY,
    meal_plan_day_id   BIGINT           NOT NULL REFERENCES meal_plan_days (id) ON DELETE CASCADE,
    user_profile_id    BIGINT           NOT NULL REFERENCES user_profiles (id),
    recipe_id          BIGINT           NOT NULL REFERENCES recipes (id),
    meal_type          VARCHAR(20)      NOT NULL,
    scaling_factor     DOUBLE PRECISION NOT NULL,
    calculated_kcal    INT              NOT NULL DEFAULT 0,
    calculated_protein DOUBLE PRECISION NOT NULL DEFAULT 0,
    calculated_carbs   DOUBLE PRECISION NOT NULL DEFAULT 0,
    calculated_fat     DOUBLE PRECISION NOT NULL DEFAULT 0
);

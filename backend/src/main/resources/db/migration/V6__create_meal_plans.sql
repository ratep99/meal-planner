CREATE TABLE meal_plans (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    days_count INT          NOT NULL DEFAULT 3,
    start_date DATE         NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE meal_plan_user_profiles (
    meal_plan_id    BIGINT NOT NULL REFERENCES meal_plans (id) ON DELETE CASCADE,
    user_profile_id BIGINT NOT NULL REFERENCES user_profiles (id),
    PRIMARY KEY (meal_plan_id, user_profile_id)
);

CREATE TABLE user_profiles (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT         NOT NULL REFERENCES users (id),
    display_name     VARCHAR(255)   NOT NULL,
    gender           VARCHAR(10)    NOT NULL,
    age              INT            NOT NULL,
    height_cm        INT            NOT NULL,
    weight_kg        DOUBLE PRECISION NOT NULL,
    activity_level   VARCHAR(20)    NOT NULL,
    goal             VARCHAR(20)    NOT NULL,
    calculated_kcal  INT            NOT NULL DEFAULT 0,
    target_protein   INT            NOT NULL DEFAULT 0,
    target_carbs     INT            NOT NULL DEFAULT 0,
    target_fat       INT            NOT NULL DEFAULT 0
);

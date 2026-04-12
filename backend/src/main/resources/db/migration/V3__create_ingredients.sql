CREATE TABLE ingredients (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(255)     NOT NULL,
    open_food_facts_id  VARCHAR(255),
    source              VARCHAR(20)      NOT NULL,
    unit_type           VARCHAR(10)      NOT NULL,
    piece_weight_grams  DOUBLE PRECISION,
    kcal_per_100g       DOUBLE PRECISION NOT NULL,
    protein_per_100g    DOUBLE PRECISION NOT NULL,
    carbs_per_100g      DOUBLE PRECISION NOT NULL,
    fat_per_100g        DOUBLE PRECISION NOT NULL,
    fiber_per_100g      DOUBLE PRECISION NOT NULL DEFAULT 0,
    category            VARCHAR(20)      NOT NULL,
    created_at          TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    manual_override     BOOLEAN          NOT NULL DEFAULT FALSE
);

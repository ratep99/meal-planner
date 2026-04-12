CREATE TABLE recipe_ingredients (
    id            BIGSERIAL PRIMARY KEY,
    recipe_id     BIGINT           NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
    ingredient_id BIGINT           NOT NULL REFERENCES ingredients (id),
    quantity      DOUBLE PRECISION NOT NULL,
    unit          VARCHAR(10)      NOT NULL,
    optional      BOOLEAN          NOT NULL DEFAULT FALSE
);

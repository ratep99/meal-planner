CREATE TABLE shopping_lists (
    id               BIGSERIAL PRIMARY KEY,
    name             VARCHAR(255) NOT NULL,
    date_range_start DATE         NOT NULL,
    date_range_end   DATE         NOT NULL
);

CREATE TABLE shopping_list_meal_plans (
    shopping_list_id BIGINT NOT NULL REFERENCES shopping_lists (id) ON DELETE CASCADE,
    meal_plan_id     BIGINT NOT NULL REFERENCES meal_plans (id),
    PRIMARY KEY (shopping_list_id, meal_plan_id)
);

CREATE TABLE shopping_list_items (
    id               BIGSERIAL PRIMARY KEY,
    shopping_list_id BIGINT           NOT NULL REFERENCES shopping_lists (id) ON DELETE CASCADE,
    ingredient_id    BIGINT           NOT NULL REFERENCES ingredients (id),
    total_quantity   DOUBLE PRECISION NOT NULL,
    display_unit     VARCHAR(10)      NOT NULL,
    category         VARCHAR(20)      NOT NULL
);

-- Stores per-meal-plan quantity breakdown: shopping_list_item_id + meal_plan_id → quantity
CREATE TABLE shopping_list_item_quantities (
    shopping_list_item_id BIGINT           NOT NULL REFERENCES shopping_list_items (id) ON DELETE CASCADE,
    meal_plan_id          BIGINT           NOT NULL,
    quantity              DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (shopping_list_item_id, meal_plan_id)
);

package com.mealplanner.recipe;

import com.mealplanner.common.enums.QuantityUnit;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class RecipeIngredientResponse {

    private Long id;
    private Long ingredientId;
    /** Full nested ingredient nutrition (per 100g / piece metadata). */
    private RecipeNestedIngredientResponse ingredient;
    private double quantity;
    private QuantityUnit unit;
    private boolean optional;
    /** Per-line contribution for this recipe line. */
    private double kcal;
    private double protein;
    private double carbs;
    private double fat;

    public static RecipeIngredientResponse from(RecipeIngredient ri) {
        MacroTotals macros = MacroCalculator.calculateFor(ri);

        RecipeIngredientResponse r = new RecipeIngredientResponse();
        r.id = ri.getId();
        r.ingredientId = ri.getIngredient().getId();
        r.ingredient = RecipeNestedIngredientResponse.from(ri.getIngredient());
        r.quantity = ri.getQuantity();
        r.unit = ri.getUnit();
        r.optional = ri.isOptional();
        r.kcal = macros.getKcal();
        r.protein = macros.getProtein();
        r.carbs = macros.getCarbs();
        r.fat = macros.getFat();
        return r;
    }
}

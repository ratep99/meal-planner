package com.mealplanner.recipe;

import com.mealplanner.common.enums.UnitType;
import com.mealplanner.ingredient.Ingredient;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Nutrition fields from {@link Ingredient} embedded on each recipe line (per-serving macros stay on {@link RecipeIngredientResponse}).
 */
@Getter
@Setter
@NoArgsConstructor
public class RecipeNestedIngredientResponse {

    private String name;
    private double kcalPer100g;
    private double proteinPer100g;
    private double carbsPer100g;
    private double fatPer100g;
    private UnitType unitType;
    private Double pieceWeightGrams;

    public static RecipeNestedIngredientResponse from(Ingredient i) {
        RecipeNestedIngredientResponse r = new RecipeNestedIngredientResponse();
        r.name = i.getName();
        r.kcalPer100g = i.getKcalPer100g();
        r.proteinPer100g = i.getProteinPer100g();
        r.carbsPer100g = i.getCarbsPer100g();
        r.fatPer100g = i.getFatPer100g();
        r.unitType = i.getUnitType();
        r.pieceWeightGrams = i.getPieceWeightGrams();
        return r;
    }
}

package com.mealplanner.ingredient.openff;

import com.mealplanner.common.enums.IngredientCategory;
import com.mealplanner.common.enums.IngredientSource;
import com.mealplanner.common.enums.UnitType;
import com.mealplanner.ingredient.Ingredient;
import org.springframework.stereotype.Component;

@Component
public class OpenFoodFactsMapper {

    /**
     * Maps an OFF product to a new Ingredient entity.
     * Nutritional values default to 0 when absent in the OFF response.
     */
    public Ingredient toIngredient(OFFProduct product) {
        Ingredient ingredient = new Ingredient();
        ingredient.setName(product.getProductName());
        ingredient.setOpenFoodFactsId(product.getCode());
        ingredient.setSource(IngredientSource.OPEN_FOOD_FACTS);
        ingredient.setUnitType(UnitType.WEIGHT);
        ingredient.setCategory(IngredientCategory.OTHER);
        ingredient.setManualOverride(false);

        OFFNutriments n = product.getNutriments();
        if (n != null) {
            ingredient.setKcalPer100g(nullSafe(n.getKcalPer100g()));
            ingredient.setProteinPer100g(nullSafe(n.getProteinPer100g()));
            ingredient.setCarbsPer100g(nullSafe(n.getCarbsPer100g()));
            ingredient.setFatPer100g(nullSafe(n.getFatPer100g()));
            ingredient.setFiberPer100g(nullSafe(n.getFiberPer100g()));
        }

        return ingredient;
    }

    private double nullSafe(Double value) {
        return value != null ? value : 0.0;
    }
}

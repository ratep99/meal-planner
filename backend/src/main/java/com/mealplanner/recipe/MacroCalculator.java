package com.mealplanner.recipe;

import com.mealplanner.common.enums.QuantityUnit;
import com.mealplanner.ingredient.Ingredient;

import java.util.List;

/**
 * Pure static utility for macro calculation.
 * No Spring context required — fully unit-testable without a container.
 */
public final class MacroCalculator {

    private MacroCalculator() {}

    /**
     * GRAMS: macro = (per100g / 100) × quantity
     */
    public static MacroTotals calculateForGrams(Ingredient ingredient, double quantity) {
        double factor = quantity / 100.0;
        return new MacroTotals(
                ingredient.getKcalPer100g()    * factor,
                ingredient.getProteinPer100g() * factor,
                ingredient.getCarbsPer100g()   * factor,
                ingredient.getFatPer100g()     * factor
        );
    }

    /**
     * PIECES: macro = (per100g / 100) × quantity × pieceWeightGrams
     */
    public static MacroTotals calculateForPieces(Ingredient ingredient, double quantity) {
        if (ingredient.getPieceWeightGrams() == null) {
            throw new IllegalStateException(
                    "Ingredient '" + ingredient.getName() + "' is PIECE type but pieceWeightGrams is not set");
        }
        double totalGrams = quantity * ingredient.getPieceWeightGrams();
        return calculateForGrams(ingredient, totalGrams);
    }

    /**
     * Dispatches to the correct method based on the unit stored on each RecipeIngredient,
     * then sums across all entries.
     */
    public static MacroTotals sumRecipeMacros(List<RecipeIngredient> ingredients) {
        return ingredients.stream()
                .map(ri -> {
                    if (ri.getUnit() == QuantityUnit.PIECES) {
                        return calculateForPieces(ri.getIngredient(), ri.getQuantity());
                    }
                    return calculateForGrams(ri.getIngredient(), ri.getQuantity());
                })
                .reduce(MacroTotals.zero(), MacroTotals::plus);
    }

    /** Convenience dispatch for a single RecipeIngredient. */
    public static MacroTotals calculateFor(RecipeIngredient ri) {
        if (ri.getUnit() == QuantityUnit.PIECES) {
            return calculateForPieces(ri.getIngredient(), ri.getQuantity());
        }
        return calculateForGrams(ri.getIngredient(), ri.getQuantity());
    }
}

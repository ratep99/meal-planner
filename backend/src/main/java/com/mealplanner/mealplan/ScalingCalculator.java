package com.mealplanner.mealplan;

import com.mealplanner.common.enums.QuantityUnit;
import com.mealplanner.profile.UserProfile;
import com.mealplanner.recipe.MacroCalculator;
import com.mealplanner.recipe.MacroTotals;
import com.mealplanner.recipe.Recipe;
import com.mealplanner.recipe.RecipeIngredient;

import java.util.List;

/**
 * Pure static scaling utility.
 * No Spring context required — fully unit-testable without a container.
 *
 * Scaling formula:
 *   scalingFactor = (profile.calculatedKcal / mealsPerDay) / recipe.totalKcal
 *
 * PIECE rounding rule:
 *   scaledQuantity = round(raw), minimum 1  (never 0.7 of a tortilla)
 */
public final class ScalingCalculator {

    private ScalingCalculator() {}

    /**
     * Derives the scaling factor for a recipe given a user's daily target and
     * how many meals they eat per day.
     *
     * @return 1.0 if the recipe has no calories (avoids divide-by-zero)
     */
    public static double calculateScalingFactor(UserProfile profile, Recipe recipe, int mealsPerDay) {
        double totalKcal = MacroCalculator.sumRecipeMacros(recipe.getIngredients()).getKcal();
        if (totalKcal == 0) {
            return 1.0;
        }
        double mealKcalTarget = (double) profile.getCalculatedKcal() / mealsPerDay;
        return mealKcalTarget / totalKcal;
    }

    /**
     * Scales a single recipe ingredient by the given factor.
     * PIECE ingredients are rounded to the nearest integer, minimum 1.
     * GRAMS ingredients are left as a continuous value.
     */
    public static ScaledIngredient scaleIngredient(RecipeIngredient ri, double scalingFactor) {
        double raw = ri.getQuantity() * scalingFactor;

        if (ri.getUnit() == QuantityUnit.PIECES) {
            double rounded = roundPieces(raw);
            MacroTotals macros = MacroCalculator.calculateForPieces(ri.getIngredient(), rounded);
            return new ScaledIngredient(rounded, QuantityUnit.PIECES, macros);
        }

        MacroTotals macros = MacroCalculator.calculateForGrams(ri.getIngredient(), raw);
        return new ScaledIngredient(raw, QuantityUnit.GRAMS, macros);
    }

    /**
     * Rounds a piece quantity to the nearest integer, with a minimum of 1.
     */
    public static int roundPieces(double quantity) {
        return Math.max(1, (int) Math.round(quantity));
    }

    /**
     * Scales all ingredients in a recipe and returns the summed macro totals.
     * Used by the service to populate calculatedKcal/protein/carbs/fat on an entry.
     */
    public static MacroTotals sumScaledMacros(List<RecipeIngredient> ingredients, double scalingFactor) {
        return ingredients.stream()
                .map(ri -> scaleIngredient(ri, scalingFactor))
                .map(ScaledIngredient::getMacros)
                .reduce(MacroTotals.zero(), MacroTotals::plus);
    }
}

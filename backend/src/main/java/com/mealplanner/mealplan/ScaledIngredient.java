package com.mealplanner.mealplan;

import com.mealplanner.common.enums.QuantityUnit;
import com.mealplanner.recipe.MacroTotals;

/**
 * Immutable result of scaling a single RecipeIngredient.
 * Not a Spring bean — used purely as a data carrier by ScalingCalculator.
 */
public final class ScaledIngredient {

    private final double scaledQuantity;
    private final QuantityUnit unit;
    private final MacroTotals macros;

    public ScaledIngredient(double scaledQuantity, QuantityUnit unit, MacroTotals macros) {
        this.scaledQuantity = scaledQuantity;
        this.unit = unit;
        this.macros = macros;
    }

    public double getScaledQuantity() { return scaledQuantity; }
    public QuantityUnit getUnit()      { return unit; }
    public MacroTotals getMacros()     { return macros; }
}

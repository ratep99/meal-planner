package com.mealplanner.recipe;

/**
 * Immutable value object holding calculated macro totals.
 * Not a Spring bean — used purely as a data carrier by MacroCalculator.
 */
public final class MacroTotals {

    private final double kcal;
    private final double protein;
    private final double carbs;
    private final double fat;

    public MacroTotals(double kcal, double protein, double carbs, double fat) {
        this.kcal = kcal;
        this.protein = protein;
        this.carbs = carbs;
        this.fat = fat;
    }

    public static MacroTotals zero() {
        return new MacroTotals(0, 0, 0, 0);
    }

    public MacroTotals plus(MacroTotals other) {
        return new MacroTotals(
                this.kcal + other.kcal,
                this.protein + other.protein,
                this.carbs + other.carbs,
                this.fat + other.fat
        );
    }

    public double getKcal()    { return kcal; }
    public double getProtein() { return protein; }
    public double getCarbs()   { return carbs; }
    public double getFat()     { return fat; }
}

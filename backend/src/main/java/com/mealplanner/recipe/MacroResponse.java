package com.mealplanner.recipe;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Recipe macro totals — JSON shape is exactly {@code { "kcal", "protein", "carbs", "fat" }} (camelCase, numbers).
 */
@Getter
@Setter
@NoArgsConstructor
public class MacroResponse {

    private double kcal;
    private double protein;
    private double carbs;
    private double fat;

    public static MacroResponse from(MacroTotals totals) {
        MacroResponse r = new MacroResponse();
        r.kcal = totals.getKcal();
        r.protein = totals.getProtein();
        r.carbs = totals.getCarbs();
        r.fat = totals.getFat();
        return r;
    }
}

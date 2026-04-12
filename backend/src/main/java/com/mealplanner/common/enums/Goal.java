package com.mealplanner.common.enums;

/**
 * Training goal applied after maintenance TDEE (Mifflin–St Jeor × activity).
 * {@link #calorieMultiplier} scales maintenance calories to the daily calorie target
 * used for {@code calculatedKcal} and carb filling.
 */
public enum Goal {

    /** Moderate deficit: maintenance kcal × 0.85 (−15%). */
    CUT(0.85),

    /** No adjustment: daily target = maintenance TDEE. */
    MAINTAIN(1.0),

    /** Moderate surplus: maintenance kcal × 1.125 (+12.5%). */
    BULK(1.125);

    private final double calorieMultiplier;

    Goal(double calorieMultiplier) {
        this.calorieMultiplier = calorieMultiplier;
    }

    /** Factor applied to maintenance TDEE to produce the calorie budget for macros. */
    public double getCalorieMultiplier() {
        return calorieMultiplier;
    }
}

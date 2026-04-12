package com.mealplanner.profile;

import com.mealplanner.common.enums.ActivityLevel;
import com.mealplanner.common.enums.Gender;

/**
 * Pure static Mifflin-St Jeor TDEE calculator.
 * No Spring context required — fully unit-testable without a container.
 *
 * <p><strong>Order of operations</strong>
 * <ol>
 *   <li>BMR (Mifflin–St Jeor by gender)</li>
 *   <li>Maintenance TDEE = BMR × activity multiplier</li>
 *   <li>Calorie budget = maintenance TDEE × {@link com.mealplanner.common.enums.Goal#getCalorieMultiplier() goal multiplier}
 *       ({@code CUT} −15%, {@code MAINTAIN} 0%, {@code BULK} +12.5%)</li>
 *   <li>Protein (g) = round(proteinMultiplier × weightKg); fat (g) = round(fatMultiplier × weightKg)</li>
 *   <li>Carbs (g) = round(max(0, calorieBudget − protein×4 − fat×9) / 4) using unrounded budget</li>
 *   <li>Daily kcal target = round(calorie budget) → stored as {@code calculatedKcal}</li>
 * </ol>
 *
 * <p>{@link TDEEResult#getRawTdee()} is always <em>maintenance</em> TDEE (before goal), for breakdown UIs.
 *
 * <p>Formulas:
 *   BMR (male)   = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
 *   BMR (female) = 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
 */
public final class TDEECalculator {

    private TDEECalculator() {}

    public static TDEEResult calculate(UserProfile profile) {
        double bmr = calculateBmr(profile);
        double maintenanceTdee = bmr * activityMultiplier(profile.getActivityLevel());
        double calorieBudget = maintenanceTdee * profile.getGoal().getCalorieMultiplier();

        int protein = (int) Math.round(profile.getProteinMultiplier() * profile.getWeightKg());
        int fat     = (int) Math.round(profile.getFatMultiplier()     * profile.getWeightKg());

        // Use raw calorie budget (not rounded) for carb calculation to avoid rounding drift
        double remainingKcal = calorieBudget - (protein * 4.0) - (fat * 9.0);
        int carbs = (int) Math.round(Math.max(0, remainingKcal) / 4.0);
        int kcal  = (int) Math.round(calorieBudget);

        return new TDEEResult(kcal, protein, carbs, fat, bmr, maintenanceTdee);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private static double calculateBmr(UserProfile profile) {
        double base = 10.0 * profile.getWeightKg()
                    +  6.25 * profile.getHeightCm()
                    -  5.0  * profile.getAge();
        return profile.getGender() == Gender.MALE ? base + 5 : base - 161;
    }

    private static double activityMultiplier(ActivityLevel level) {
        return switch (level) {
            case SEDENTARY  -> 1.2;
            case LIGHT      -> 1.375;
            case MODERATE   -> 1.55;
            case ACTIVE     -> 1.725;
            case VERY_ACTIVE -> 1.9;
        };
    }
}

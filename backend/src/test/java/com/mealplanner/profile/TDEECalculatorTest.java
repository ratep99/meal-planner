package com.mealplanner.profile;

import com.mealplanner.common.enums.ActivityLevel;
import com.mealplanner.common.enums.Gender;
import com.mealplanner.common.enums.Goal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit tests — no Spring context needed.
 *
 * Reference profile A (male): 80 kg, 180 cm, age 30, multipliers 2.0 / 0.8
 *   BMR = 10×80 + 6.25×180 − 5×30 + 5 = 1780
 *
 * Reference profile B (female): 60 kg, 165 cm, age 25, multipliers 2.0 / 0.8
 *   BMR = 10×60 + 6.25×165 − 5×25 − 161 = 1345.25
 *
 * Macro derivation:
 *   maintenanceTdee = BMR × activity
 *   calorieBudget   = maintenanceTdee × goal.getCalorieMultiplier()
 *   protein (g)     = round(multiplier × weight)
 *   fat     (g)     = round(multiplier × weight)
 *   carbs   (g)     = round(max(0, calorieBudget − protein×4 − fat×9) / 4)   [uses raw budget]
 *   kcal            = round(calorieBudget)
 */
class TDEECalculatorTest {

    // =========================================================================
    // Profile builders
    // =========================================================================

    private static UserProfile maleProfile(ActivityLevel level) {
        return profile(Gender.MALE, 80, 180, 30, level, 2.0, 0.8);
    }

    private static UserProfile femaleProfile(ActivityLevel level) {
        return profile(Gender.FEMALE, 60, 165, 25, level, 2.0, 0.8);
    }

    private static UserProfile profile(Gender gender, double weightKg, int heightCm, int age,
                                        ActivityLevel level, double proteinMult, double fatMult) {
        UserProfile p = new UserProfile();
        p.setGender(gender);
        p.setWeightKg(weightKg);
        p.setHeightCm(heightCm);
        p.setAge(age);
        p.setActivityLevel(level);
        p.setGoal(Goal.MAINTAIN);
        p.setProteinMultiplier(proteinMult);
        p.setFatMultiplier(fatMult);
        p.setDisplayName("Test");
        return p;
    }

    private static UserProfile withGoal(UserProfile base, Goal goal) {
        base.setGoal(goal);
        return base;
    }

    // =========================================================================
    // BMR
    // =========================================================================

    @Test
    @DisplayName("Male BMR = 10w + 6.25h − 5a + 5")
    void maleBmr() {
        TDEEResult r = TDEECalculator.calculate(maleProfile(ActivityLevel.SEDENTARY));
        assertEquals(1780.0, r.getRawBmr(), 0.001);
    }

    @Test
    @DisplayName("Female BMR = 10w + 6.25h − 5a − 161")
    void femaleBmr() {
        TDEEResult r = TDEECalculator.calculate(femaleProfile(ActivityLevel.SEDENTARY));
        assertEquals(1345.25, r.getRawBmr(), 0.001);
    }

    // =========================================================================
    // Male × all 5 activity levels
    // =========================================================================
    //
    // BMR = 1780, protein = round(2.0×80) = 160g, fat = round(0.8×80) = 64g
    // protein_kcal = 640, fat_kcal = 576, fixed = 1216
    //
    // SEDENTARY  : tdee = 1780×1.200 = 2136.000 → kcal=2136, carbs=round((2136.000−1216)/4)=round(230.000)=230
    // LIGHT      : tdee = 1780×1.375 = 2447.500 → kcal=2448, carbs=round((2447.500−1216)/4)=round(307.875)=308
    // MODERATE   : tdee = 1780×1.550 = 2759.000 → kcal=2759, carbs=round((2759.000−1216)/4)=round(385.750)=386
    // ACTIVE     : tdee = 1780×1.725 = 3070.500 → kcal=3071, carbs=round((3070.500−1216)/4)=round(463.625)=464
    // VERY_ACTIVE: tdee = 1780×1.900 = 3382.000 → kcal=3382, carbs=round((3382.000−1216)/4)=round(541.500)=542

    @Nested
    @DisplayName("Male — kcal across activity levels")
    class MaleKcal {

        @Test void sedentary()  { assertKcal(maleProfile(ActivityLevel.SEDENTARY),   2136); }
        @Test void light()      { assertKcal(maleProfile(ActivityLevel.LIGHT),        2448); }
        @Test void moderate()   { assertKcal(maleProfile(ActivityLevel.MODERATE),     2759); }
        @Test void active()     { assertKcal(maleProfile(ActivityLevel.ACTIVE),       3071); }
        @Test void veryActive() { assertKcal(maleProfile(ActivityLevel.VERY_ACTIVE),  3382); }
    }

    @Nested
    @DisplayName("Male — macros (sedentary baseline)")
    class MaleMacros {

        @Test
        void protein() { assertEquals(160, TDEECalculator.calculate(maleProfile(ActivityLevel.SEDENTARY)).getProtein()); }

        @Test
        void fat() { assertEquals(64, TDEECalculator.calculate(maleProfile(ActivityLevel.SEDENTARY)).getFat()); }

        @Test
        void carbsSedentary()  { assertCarbs(maleProfile(ActivityLevel.SEDENTARY),  230); }

        @Test
        void carbsLight()      { assertCarbs(maleProfile(ActivityLevel.LIGHT),      308); }

        @Test
        void carbsModerate()   { assertCarbs(maleProfile(ActivityLevel.MODERATE),   386); }

        @Test
        void carbsActive()     { assertCarbs(maleProfile(ActivityLevel.ACTIVE),     464); }

        @Test
        void carbsVeryActive() { assertCarbs(maleProfile(ActivityLevel.VERY_ACTIVE), 542); }
    }

    // =========================================================================
    // Female × all 5 activity levels
    // =========================================================================
    //
    // BMR = 1345.25, protein = round(2.0×60) = 120g, fat = round(0.8×60) = 48g
    // protein_kcal = 480, fat_kcal = 432, fixed = 912
    //
    // SEDENTARY  : tdee = 1345.25×1.200 = 1614.300 → kcal=1614, carbs=round((1614.300−912)/4)=round(175.575)=176
    // LIGHT      : tdee = 1345.25×1.375 = 1849.719 → kcal=1850, carbs=round((1849.719−912)/4)=round(234.430)=234
    // MODERATE   : tdee = 1345.25×1.550 = 2085.138 → kcal=2085, carbs=round((2085.138−912)/4)=round(293.284)=293
    // ACTIVE     : tdee = 1345.25×1.725 = 2320.556 → kcal=2321, carbs=round((2320.556−912)/4)=round(352.139)=352
    // VERY_ACTIVE: tdee = 1345.25×1.900 = 2555.975 → kcal=2556, carbs=round((2555.975−912)/4)=round(410.994)=411

    @Nested
    @DisplayName("Female — kcal across activity levels")
    class FemaleKcal {

        @Test void sedentary()  { assertKcal(femaleProfile(ActivityLevel.SEDENTARY),   1614); }
        @Test void light()      { assertKcal(femaleProfile(ActivityLevel.LIGHT),        1850); }
        @Test void moderate()   { assertKcal(femaleProfile(ActivityLevel.MODERATE),     2085); }
        @Test void active()     { assertKcal(femaleProfile(ActivityLevel.ACTIVE),       2321); }
        @Test void veryActive() { assertKcal(femaleProfile(ActivityLevel.VERY_ACTIVE),  2556); }
    }

    @Nested
    @DisplayName("Female — macros (sedentary baseline)")
    class FemaleMacros {

        @Test
        void protein() { assertEquals(120, TDEECalculator.calculate(femaleProfile(ActivityLevel.SEDENTARY)).getProtein()); }

        @Test
        void fat() { assertEquals(48, TDEECalculator.calculate(femaleProfile(ActivityLevel.SEDENTARY)).getFat()); }

        @Test
        void carbsSedentary()  { assertCarbs(femaleProfile(ActivityLevel.SEDENTARY),  176); }

        @Test
        void carbsLight()      { assertCarbs(femaleProfile(ActivityLevel.LIGHT),      234); }

        @Test
        void carbsModerate()   { assertCarbs(femaleProfile(ActivityLevel.MODERATE),   293); }

        @Test
        void carbsActive()     { assertCarbs(femaleProfile(ActivityLevel.ACTIVE),     352); }

        @Test
        void carbsVeryActive() { assertCarbs(femaleProfile(ActivityLevel.VERY_ACTIVE), 411); }
    }

    // =========================================================================
    // Custom multipliers
    // =========================================================================

    @Test
    @DisplayName("Custom proteinMultiplier=2.5 is applied correctly")
    void customProteinMultiplier() {
        // 80 kg × 2.5 = 200g protein
        UserProfile p = profile(Gender.MALE, 80, 180, 30, ActivityLevel.SEDENTARY, 2.5, 0.8);
        assertEquals(200, TDEECalculator.calculate(p).getProtein());
    }

    @Test
    @DisplayName("Custom fatMultiplier=1.0 is applied correctly")
    void customFatMultiplier() {
        // 80 kg × 1.0 = 80g fat
        UserProfile p = profile(Gender.MALE, 80, 180, 30, ActivityLevel.SEDENTARY, 2.0, 1.0);
        assertEquals(80, TDEECalculator.calculate(p).getFat());
    }

    @Test
    @DisplayName("Carbs never go negative when macros exceed TDEE")
    void carbsNeverNegative() {
        // Extremely high multipliers to force negative remainder
        UserProfile p = profile(Gender.FEMALE, 60, 165, 25, ActivityLevel.SEDENTARY, 10.0, 10.0);
        assertTrue(TDEECalculator.calculate(p).getCarbs() >= 0);
    }

    @Test
    @DisplayName("Result exposes raw BMR and maintenance TDEE for breakdown endpoint (unchanged by goal)")
    void rawValuesExposed() {
        TDEEResult r = TDEECalculator.calculate(maleProfile(ActivityLevel.SEDENTARY));
        assertEquals(1780.0, r.getRawBmr(),  0.001);
        assertEquals(2136.0, r.getRawTdee(), 0.001);
    }

    @Nested
    @DisplayName("Goal adjusts calorie target and carbs; protein/fat unchanged; maintenance TDEE unchanged")
    class GoalAdjustment {

        @Test
        @DisplayName("Male sedentary: CUT vs MAINTAIN vs BULK produce distinct kcal and carbs")
        void maleSedentaryCutMaintainBulk() {
            UserProfile base = maleProfile(ActivityLevel.SEDENTARY);
            TDEEResult cut = TDEECalculator.calculate(withGoal(base, Goal.CUT));
            UserProfile base2 = maleProfile(ActivityLevel.SEDENTARY);
            TDEEResult maintain = TDEECalculator.calculate(withGoal(base2, Goal.MAINTAIN));
            UserProfile base3 = maleProfile(ActivityLevel.SEDENTARY);
            TDEEResult bulk = TDEECalculator.calculate(withGoal(base3, Goal.BULK));

            assertEquals(2136.0, cut.getRawTdee(), 0.001);
            assertEquals(2136.0, maintain.getRawTdee(), 0.001);
            assertEquals(2136.0, bulk.getRawTdee(), 0.001);

            assertEquals(1816, cut.getKcal());
            assertEquals(2136, maintain.getKcal());
            assertEquals(2403, bulk.getKcal());

            assertEquals(160, cut.getProtein());
            assertEquals(160, maintain.getProtein());
            assertEquals(160, bulk.getProtein());

            assertEquals(150, cut.getCarbs());
            assertEquals(230, maintain.getCarbs());
            assertEquals(297, bulk.getCarbs());
        }

        @Test
        @DisplayName("Female sedentary: CUT vs MAINTAIN vs BULK produce distinct kcal and carbs")
        void femaleSedentaryCutMaintainBulk() {
            TDEEResult cut = TDEECalculator.calculate(withGoal(femaleProfile(ActivityLevel.SEDENTARY), Goal.CUT));
            TDEEResult maintain = TDEECalculator.calculate(withGoal(femaleProfile(ActivityLevel.SEDENTARY), Goal.MAINTAIN));
            TDEEResult bulk = TDEECalculator.calculate(withGoal(femaleProfile(ActivityLevel.SEDENTARY), Goal.BULK));

            assertEquals(1372, cut.getKcal());
            assertEquals(1614, maintain.getKcal());
            assertEquals(1816, bulk.getKcal());

            assertEquals(115, cut.getCarbs());
            assertEquals(176, maintain.getCarbs());
            assertEquals(226, bulk.getCarbs());
        }
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private void assertKcal(UserProfile profile, int expected) {
        assertEquals(expected, TDEECalculator.calculate(profile).getKcal());
    }

    private void assertCarbs(UserProfile profile, int expected) {
        assertEquals(expected, TDEECalculator.calculate(profile).getCarbs());
    }
}

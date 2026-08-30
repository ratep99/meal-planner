package com.mealplanner.mealplan;

import com.mealplanner.common.enums.ActivityLevel;
import com.mealplanner.common.enums.Gender;
import com.mealplanner.common.enums.Goal;
import com.mealplanner.common.enums.IngredientCategory;
import com.mealplanner.common.enums.IngredientSource;
import com.mealplanner.common.enums.QuantityUnit;
import com.mealplanner.common.enums.UnitType;
import com.mealplanner.ingredient.Ingredient;
import com.mealplanner.profile.UserProfile;
import com.mealplanner.recipe.MacroTotals;
import com.mealplanner.recipe.Recipe;
import com.mealplanner.recipe.RecipeIngredient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit tests — no Spring context needed.
 *
 * Scaling contract:
 *   mealKcalTarget = profile.calculatedKcal / mealsPerDay
 *   scalingFactor  = mealKcalTarget / recipe.totalKcal
 *   scaledQuantity = quantity × scalingFactor
 *   PIECE lines    = round(scaledQuantity), minimum 1
 *
 * Note that `calculatedKcal` is the goal-adjusted daily target, never the raw
 * maintenance TDEE — see TDEECalculatorTest.
 *
 * Reference ingredients:
 *   CHICKEN  (WEIGHT):            per 100g → 165 kcal, 31.0 P,  0.0 C, 3.6 F
 *   TORTILLA (PIECE, 45 g/piece): per 100g → 300 kcal,  8.0 P, 50.0 C, 7.0 F
 */
class ScalingCalculatorTest {

    private static final double EPS = 1e-9;

    // =========================================================================
    // Fixtures
    // =========================================================================

    private static Ingredient chicken() {
        Ingredient i = new Ingredient();
        i.setName("Chicken breast");
        i.setSource(IngredientSource.MANUAL);
        i.setUnitType(UnitType.WEIGHT);
        i.setCategory(IngredientCategory.MEAT);
        i.setKcalPer100g(165);
        i.setProteinPer100g(31.0);
        i.setCarbsPer100g(0.0);
        i.setFatPer100g(3.6);
        return i;
    }

    private static Ingredient tortilla() {
        Ingredient i = new Ingredient();
        i.setName("Tortilla");
        i.setSource(IngredientSource.MANUAL);
        i.setUnitType(UnitType.PIECE);
        i.setPieceWeightGrams(45.0);
        i.setCategory(IngredientCategory.GRAIN);
        i.setKcalPer100g(300);
        i.setProteinPer100g(8.0);
        i.setCarbsPer100g(50.0);
        i.setFatPer100g(7.0);
        return i;
    }

    /** An ingredient with no calories — used to exercise the divide-by-zero guard. */
    private static Ingredient water() {
        Ingredient i = new Ingredient();
        i.setName("Water");
        i.setSource(IngredientSource.MANUAL);
        i.setUnitType(UnitType.WEIGHT);
        i.setCategory(IngredientCategory.OTHER);
        return i;
    }

    private static RecipeIngredient line(Ingredient ingredient, double quantity, QuantityUnit unit) {
        RecipeIngredient ri = new RecipeIngredient();
        ri.setIngredient(ingredient);
        ri.setQuantity(quantity);
        ri.setUnit(unit);
        return ri;
    }

    private static Recipe recipe(RecipeIngredient... lines) {
        Recipe r = new Recipe();
        r.setName("Test recipe");
        r.getIngredients().addAll(List.of(lines));
        return r;
    }

    private static UserProfile profileWithTarget(int calculatedKcal) {
        UserProfile p = new UserProfile();
        p.setDisplayName("Test");
        p.setGender(Gender.MALE);
        p.setAge(30);
        p.setHeightCm(180);
        p.setWeightKg(80);
        p.setActivityLevel(ActivityLevel.MODERATE);
        p.setGoal(Goal.MAINTAIN);
        p.setCalculatedKcal(calculatedKcal);
        return p;
    }

    // =========================================================================
    // roundPieces
    // =========================================================================

    @Nested
    @DisplayName("roundPieces")
    class RoundPieces {

        @Test
        @DisplayName("rounds to the nearest integer")
        void roundsToNearest() {
            assertAll(
                    () -> assertEquals(1, ScalingCalculator.roundPieces(1.4)),
                    () -> assertEquals(2, ScalingCalculator.roundPieces(1.5)),
                    () -> assertEquals(2, ScalingCalculator.roundPieces(2.4)),
                    () -> assertEquals(3, ScalingCalculator.roundPieces(2.6)),
                    () -> assertEquals(4, ScalingCalculator.roundPieces(4.0))
            );
        }

        @Test
        @DisplayName("never returns zero — a plan saying '0 eggs' is a bug")
        void minimumIsOne() {
            assertAll(
                    () -> assertEquals(1, ScalingCalculator.roundPieces(0.4)),
                    () -> assertEquals(1, ScalingCalculator.roundPieces(0.01)),
                    () -> assertEquals(1, ScalingCalculator.roundPieces(0.0)),
                    () -> assertEquals(1, ScalingCalculator.roundPieces(-3.0))
            );
        }
    }

    // =========================================================================
    // calculateScalingFactor
    // =========================================================================

    @Nested
    @DisplayName("calculateScalingFactor")
    class Factor {

        @Test
        @DisplayName("(2000 kcal / 4 meals) / 250 kcal recipe = 2.0")
        void scalesRecipeUp() {
            // 151.515… g chicken ≈ 250 kcal; use exact grams for a clean expectation:
            // 250 kcal / 165 kcal-per-100g × 100 = 151.5151…
            Recipe r = recipe(line(chicken(), 250.0 / 165.0 * 100.0, QuantityUnit.GRAMS));

            double factor = ScalingCalculator.calculateScalingFactor(profileWithTarget(2000), r, 4);
            assertEquals(2.0, factor, 1e-9);
        }

        @Test
        @DisplayName("a recipe already matching the per-meal target scales by 1.0")
        void identityFactor() {
            // 500 kcal recipe, 2000 kcal/day over 4 meals → 500 kcal per meal
            Recipe r = recipe(line(chicken(), 500.0 / 165.0 * 100.0, QuantityUnit.GRAMS));

            assertEquals(1.0, ScalingCalculator.calculateScalingFactor(profileWithTarget(2000), r, 4), 1e-9);
        }

        @Test
        @DisplayName("more meals per day means a smaller share of the daily target per meal")
        void moreMealsShrinkFactor() {
            Recipe r = recipe(line(chicken(), 100, QuantityUnit.GRAMS));

            double atFour = ScalingCalculator.calculateScalingFactor(profileWithTarget(2000), r, 4);
            double atEight = ScalingCalculator.calculateScalingFactor(profileWithTarget(2000), r, 8);

            assertEquals(atFour / 2.0, atEight, 1e-9);
        }

        @Test
        @DisplayName("a zero-calorie recipe returns 1.0 instead of dividing by zero")
        void zeroCalorieRecipeGuard() {
            Recipe r = recipe(line(water(), 500, QuantityUnit.GRAMS));

            assertEquals(1.0, ScalingCalculator.calculateScalingFactor(profileWithTarget(2000), r, 4), EPS);
        }

        @Test
        @DisplayName("an empty recipe returns 1.0 instead of dividing by zero")
        void emptyRecipeGuard() {
            assertEquals(1.0, ScalingCalculator.calculateScalingFactor(profileWithTarget(2000), recipe(), 4), EPS);
        }
    }

    // =========================================================================
    // scaleIngredient
    // =========================================================================

    @Nested
    @DisplayName("scaleIngredient")
    class ScaleIngredient {

        @Test
        @DisplayName("GRAMS quantities stay continuous")
        void gramsAreNotRounded() {
            ScaledIngredient scaled = ScalingCalculator.scaleIngredient(
                    line(chicken(), 150, QuantityUnit.GRAMS), 1.37);

            assertEquals(205.5, scaled.getScaledQuantity(), 1e-9);
            assertEquals(QuantityUnit.GRAMS, scaled.getUnit());
            assertEquals(165 * 2.055, scaled.getMacros().getKcal(), 1e-9);
        }

        @Test
        @DisplayName("PIECES quantities round to whole pieces")
        void piecesAreRounded() {
            // 2 tortillas × 1.4 = 2.8 → 3 pieces
            ScaledIngredient scaled = ScalingCalculator.scaleIngredient(
                    line(tortilla(), 2, QuantityUnit.PIECES), 1.4);

            assertEquals(3.0, scaled.getScaledQuantity(), EPS);
            assertEquals(QuantityUnit.PIECES, scaled.getUnit());
        }

        @Test
        @DisplayName("PIECES macros follow the rounded count, not the raw fraction")
        void piecesMacrosUseRoundedQuantity() {
            // 2 × 1.4 = 2.8 → 3 tortillas = 135 g → 405 kcal (not 2.8 × 135 = 378)
            ScaledIngredient scaled = ScalingCalculator.scaleIngredient(
                    line(tortilla(), 2, QuantityUnit.PIECES), 1.4);

            assertEquals(405.0, scaled.getMacros().getKcal(), 1e-9);
        }

        @Test
        @DisplayName("scaling a piece line down still yields at least one piece")
        void pieceFloorApplies() {
            ScaledIngredient scaled = ScalingCalculator.scaleIngredient(
                    line(tortilla(), 1, QuantityUnit.PIECES), 0.1);

            assertEquals(1.0, scaled.getScaledQuantity(), EPS);
            assertEquals(135.0, scaled.getMacros().getKcal(), 1e-9);
        }
    }

    // =========================================================================
    // sumScaledMacros
    // =========================================================================

    @Nested
    @DisplayName("sumScaledMacros")
    class SumScaled {

        @Test
        @DisplayName("a weight-only recipe lands exactly on the per-meal calorie target")
        void weightOnlyRecipeHitsTargetExactly() {
            // This is the property the planner actually promises the user: for a recipe
            // made of weighed ingredients, the scaled entry matches their target.
            UserProfile profile = profileWithTarget(2400);
            Recipe r = recipe(line(chicken(), 200, QuantityUnit.GRAMS));

            double factor = ScalingCalculator.calculateScalingFactor(profile, r, 4);
            MacroTotals totals = ScalingCalculator.sumScaledMacros(r.getIngredients(), factor);

            assertEquals(600.0, totals.getKcal(), 1e-9);
        }

        @Test
        @DisplayName("piece rounding makes the total drift off the target — by design")
        void pieceRoundingCausesDrift() {
            // 1 tortilla = 135 kcal. Target 600 kcal/meal → factor 4.444…, so 4.44 tortillas
            // rounds to 4 → 540 kcal. The gap is the price of not serving fractional tortillas;
            // it is expected, and this test pins it so a future change is a visible decision.
            UserProfile profile = profileWithTarget(2400);
            Recipe r = recipe(line(tortilla(), 1, QuantityUnit.PIECES));

            double factor = ScalingCalculator.calculateScalingFactor(profile, r, 4);
            MacroTotals totals = ScalingCalculator.sumScaledMacros(r.getIngredients(), factor);

            assertEquals(540.0, totals.getKcal(), 1e-9);
            assertNotEquals(600.0, totals.getKcal(), 1e-9);
        }

        @Test
        @DisplayName("sums every line of a mixed recipe")
        void mixedRecipe() {
            // factor 2.0 → 200 g chicken becomes 400 g (660 kcal),
            //              1 tortilla becomes 2 (270 kcal) → 930 kcal total
            List<RecipeIngredient> lines = List.of(
                    line(chicken(), 200, QuantityUnit.GRAMS),
                    line(tortilla(), 1, QuantityUnit.PIECES));

            MacroTotals totals = ScalingCalculator.sumScaledMacros(lines, 2.0);

            assertAll(
                    () -> assertEquals(930.0, totals.getKcal(), 1e-9),
                    () -> assertEquals(124.0 + 7.2, totals.getProtein(), 1e-9),
                    () -> assertEquals(45.0, totals.getCarbs(), 1e-9),
                    () -> assertEquals(14.4 + 6.3, totals.getFat(), 1e-9)
            );
        }

        @Test
        @DisplayName("an empty ingredient list sums to zero rather than failing")
        void emptyList() {
            MacroTotals totals = ScalingCalculator.sumScaledMacros(List.of(), 2.0);

            assertAll(
                    () -> assertEquals(0.0, totals.getKcal(), EPS),
                    () -> assertEquals(0.0, totals.getProtein(), EPS),
                    () -> assertEquals(0.0, totals.getCarbs(), EPS),
                    () -> assertEquals(0.0, totals.getFat(), EPS)
            );
        }
    }
}

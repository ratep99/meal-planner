package com.mealplanner.recipe;

import com.mealplanner.common.enums.IngredientCategory;
import com.mealplanner.common.enums.IngredientSource;
import com.mealplanner.common.enums.QuantityUnit;
import com.mealplanner.common.enums.UnitType;
import com.mealplanner.ingredient.Ingredient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit tests — no Spring context needed.
 *
 * Reference ingredients:
 *   CHICKEN  (WEIGHT):            per 100g → 165 kcal, 31.0 P,  0.0 C, 3.6 F
 *   RICE     (WEIGHT):            per 100g → 130 kcal,  2.7 P, 28.0 C, 0.3 F
 *   TORTILLA (PIECE, 45 g/piece): per 100g → 300 kcal,  8.0 P, 50.0 C, 7.0 F
 *
 * Formulas under test:
 *   GRAMS  : macro = per100g / 100 × quantity
 *   PIECES : macro = per100g / 100 × (quantity × pieceWeightGrams)
 */
class MacroCalculatorTest {

    private static final double EPS = 1e-9;

    // =========================================================================
    // Fixtures
    // =========================================================================

    private static Ingredient chicken() {
        return weightIngredient("Chicken breast", 165, 31.0, 0.0, 3.6);
    }

    private static Ingredient rice() {
        return weightIngredient("White rice", 130, 2.7, 28.0, 0.3);
    }

    private static Ingredient tortilla() {
        Ingredient i = weightIngredient("Tortilla", 300, 8.0, 50.0, 7.0);
        i.setUnitType(UnitType.PIECE);
        i.setPieceWeightGrams(45.0);
        return i;
    }

    private static Ingredient weightIngredient(String name, double kcal, double protein,
                                               double carbs, double fat) {
        Ingredient i = new Ingredient();
        i.setName(name);
        i.setSource(IngredientSource.MANUAL);
        i.setUnitType(UnitType.WEIGHT);
        i.setCategory(IngredientCategory.OTHER);
        i.setKcalPer100g(kcal);
        i.setProteinPer100g(protein);
        i.setCarbsPer100g(carbs);
        i.setFatPer100g(fat);
        return i;
    }

    private static RecipeIngredient line(Ingredient ingredient, double quantity, QuantityUnit unit) {
        RecipeIngredient ri = new RecipeIngredient();
        ri.setIngredient(ingredient);
        ri.setQuantity(quantity);
        ri.setUnit(unit);
        return ri;
    }

    private static void assertMacros(MacroTotals actual, double kcal, double protein,
                                     double carbs, double fat) {
        assertAll(
                () -> assertEquals(kcal, actual.getKcal(), EPS, "kcal"),
                () -> assertEquals(protein, actual.getProtein(), EPS, "protein"),
                () -> assertEquals(carbs, actual.getCarbs(), EPS, "carbs"),
                () -> assertEquals(fat, actual.getFat(), EPS, "fat")
        );
    }

    // =========================================================================
    // GRAMS
    // =========================================================================

    @Nested
    @DisplayName("calculateForGrams")
    class Grams {

        @Test
        @DisplayName("200 g of chicken doubles the per-100g values")
        void scalesUp() {
            assertMacros(MacroCalculator.calculateForGrams(chicken(), 200), 330.0, 62.0, 0.0, 7.2);
        }

        @Test
        @DisplayName("50 g of chicken halves the per-100g values")
        void scalesDown() {
            assertMacros(MacroCalculator.calculateForGrams(chicken(), 50), 82.5, 15.5, 0.0, 1.8);
        }

        @Test
        @DisplayName("100 g returns the per-100g values unchanged")
        void identity() {
            assertMacros(MacroCalculator.calculateForGrams(chicken(), 100), 165.0, 31.0, 0.0, 3.6);
        }

        @Test
        @DisplayName("zero quantity contributes nothing")
        void zeroQuantity() {
            assertMacros(MacroCalculator.calculateForGrams(chicken(), 0), 0.0, 0.0, 0.0, 0.0);
        }
    }

    // =========================================================================
    // PIECES
    // =========================================================================

    @Nested
    @DisplayName("calculateForPieces")
    class Pieces {

        @Test
        @DisplayName("2 tortillas = 90 g → 270 kcal")
        void convertsPiecesToGrams() {
            assertMacros(MacroCalculator.calculateForPieces(tortilla(), 2), 270.0, 7.2, 45.0, 6.3);
        }

        @Test
        @DisplayName("1 tortilla = 45 g → 135 kcal")
        void singlePiece() {
            assertMacros(MacroCalculator.calculateForPieces(tortilla(), 1), 135.0, 3.6, 22.5, 3.15);
        }

        @Test
        @DisplayName("a PIECE ingredient without pieceWeightGrams fails loudly rather than silently scoring zero")
        void missingPieceWeightThrows() {
            Ingredient broken = tortilla();
            broken.setPieceWeightGrams(null);

            IllegalStateException ex = assertThrows(IllegalStateException.class,
                    () -> MacroCalculator.calculateForPieces(broken, 2));
            assertTrue(ex.getMessage().contains("Tortilla"),
                    "message should name the offending ingredient, was: " + ex.getMessage());
        }
    }

    // =========================================================================
    // Recipe totals
    // =========================================================================

    @Nested
    @DisplayName("sumRecipeMacros")
    class RecipeTotals {

        @Test
        @DisplayName("empty recipe totals zero rather than failing")
        void emptyRecipe() {
            assertMacros(MacroCalculator.sumRecipeMacros(List.of()), 0.0, 0.0, 0.0, 0.0);
        }

        @Test
        @DisplayName("mixes GRAMS and PIECES lines in one total")
        void mixedUnits() {
            // 200 g chicken → 330 kcal, 62.0 P,  0 C, 7.2 F
            // 2 tortillas   → 270 kcal,  7.2 P, 45 C, 6.3 F
            List<RecipeIngredient> lines = List.of(
                    line(chicken(), 200, QuantityUnit.GRAMS),
                    line(tortilla(), 2, QuantityUnit.PIECES));

            assertMacros(MacroCalculator.sumRecipeMacros(lines), 600.0, 69.2, 45.0, 13.5);
        }

        @Test
        @DisplayName("sums repeated weight lines")
        void multipleWeightLines() {
            // 150 g chicken → 247.5 kcal, 46.5 P,  0 C, 5.4 F
            // 100 g rice    → 130.0 kcal,  2.7 P, 28 C, 0.3 F
            List<RecipeIngredient> lines = List.of(
                    line(chicken(), 150, QuantityUnit.GRAMS),
                    line(rice(), 100, QuantityUnit.GRAMS));

            assertMacros(MacroCalculator.sumRecipeMacros(lines), 377.5, 49.2, 28.0, 5.7);
        }

        @Test
        @DisplayName("optional lines still count towards the total")
        void optionalIsNotExcluded() {
            // Documents current behaviour: `optional` is a UI / shopping-list hint only,
            // and the macro total treats an optional line exactly like a required one.
            // If that ever changes, this is the test that should fail first.
            RecipeIngredient optionalRice = line(rice(), 100, QuantityUnit.GRAMS);
            optionalRice.setOptional(true);

            assertMacros(MacroCalculator.sumRecipeMacros(List.of(optionalRice)),
                    130.0, 2.7, 28.0, 0.3);
        }
    }

    // =========================================================================
    // Dispatch
    // =========================================================================

    @Nested
    @DisplayName("calculateFor dispatch")
    class Dispatch {

        @Test
        @DisplayName("routes a GRAMS line through the grams formula")
        void gramsLine() {
            assertMacros(MacroCalculator.calculateFor(line(chicken(), 200, QuantityUnit.GRAMS)),
                    330.0, 62.0, 0.0, 7.2);
        }

        @Test
        @DisplayName("routes a PIECES line through the piece-weight formula")
        void piecesLine() {
            assertMacros(MacroCalculator.calculateFor(line(tortilla(), 2, QuantityUnit.PIECES)),
                    270.0, 7.2, 45.0, 6.3);
        }
    }
}

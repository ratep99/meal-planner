package com.mealplanner.mealplan;

import com.mealplanner.common.enums.MealType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Full per-user-per-day breakdown of a meal plan.
 * Used by GET /api/mealplans/{id}/summary.
 */
@Getter
@Setter
@NoArgsConstructor
public class MealPlanSummaryResponse {

    private Long mealPlanId;
    private String name;
    private int daysCount;
    private List<DaySummary> days;

    // -------------------------------------------------------------------------

    @Getter
    @Setter
    @NoArgsConstructor
    public static class DaySummary {
        private int dayNumber;
        /** Each profile associated with the plan gets one entry here. */
        private List<UserDaySummary> perUser;
    }

    // -------------------------------------------------------------------------

    @Getter
    @Setter
    @NoArgsConstructor
    public static class UserDaySummary {
        private Long profileId;
        private String displayName;
        // Targets from profile
        private int targetKcal;
        private int targetProtein;
        private int targetCarbs;
        private int targetFat;
        // Actual totals from entries this day
        private int actualKcal;
        private double actualProtein;
        private double actualCarbs;
        private double actualFat;
        private List<MealEntry> meals;
    }

    // -------------------------------------------------------------------------

    @Getter
    @Setter
    @NoArgsConstructor
    public static class MealEntry {
        private Long entryId;
        private MealType mealType;
        private Long recipeId;
        private String recipeName;
        private double scalingFactor;
        private int kcal;
        private double protein;
        private double carbs;
        private double fat;

        public static MealEntry from(MealPlanEntry e) {
            MealEntry m = new MealEntry();
            m.entryId = e.getId();
            m.mealType = e.getMealType();
            m.recipeId = e.getRecipe().getId();
            m.recipeName = e.getRecipe().getName();
            m.scalingFactor = e.getScalingFactor();
            m.kcal = e.getCalculatedKcal();
            m.protein = e.getCalculatedProtein();
            m.carbs = e.getCalculatedCarbs();
            m.fat = e.getCalculatedFat();
            return m;
        }
    }
}

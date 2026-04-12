package com.mealplanner.mealplan;

import com.mealplanner.common.enums.MealType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class MealPlanEntryRequest {

    @NotNull
    private Long recipeId;

    @NotNull
    private Long userProfileId;

    @NotNull
    private MealType mealType;

    /**
     * Number of meals the user eats per day — used to compute the per-meal
     * calorie target for scaling. Defaults to 3 (breakfast / lunch / dinner).
     */
    @Min(1) @Max(10)
    private int mealsPerDay = 3;
}

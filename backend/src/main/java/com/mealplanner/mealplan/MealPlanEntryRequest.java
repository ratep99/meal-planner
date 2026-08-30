package com.mealplanner.mealplan;

import com.mealplanner.common.enums.MealType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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
     * Number of meals the user eats per day. Only used by the explicit
     * "fit day to target" action — it does not scale anything on its own.
     */
    @Min(1) @Max(10)
    private int mealsPerDay = 3;

    /**
     * Portion multiplier for this entry, applied to every ingredient quantity.
     *
     * Null means 1.0: the recipe is planned exactly as written. Scaling is never
     * applied on the user's behalf — it happens only when a factor is sent here,
     * or through the fit-to-target endpoint.
     */
    @DecimalMin("0.1") @DecimalMax("10.0")
    private Double scalingFactor;
}

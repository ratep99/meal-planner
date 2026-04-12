package com.mealplanner.mealplan;

import com.mealplanner.common.enums.MealType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class MealPlanEntryResponse {

    private Long id;
    private Long userProfileId;
    private String userProfileDisplayName;
    private Long recipeId;
    private String recipeName;
    private MealType mealType;
    private int mealsPerDay;
    private double scalingFactor;
    private int calculatedKcal;
    private double calculatedProtein;
    private double calculatedCarbs;
    private double calculatedFat;

    public static MealPlanEntryResponse from(MealPlanEntry e) {
        MealPlanEntryResponse r = new MealPlanEntryResponse();
        r.id = e.getId();
        r.userProfileId = e.getUserProfile().getId();
        r.userProfileDisplayName = e.getUserProfile().getDisplayName();
        r.recipeId = e.getRecipe().getId();
        r.recipeName = e.getRecipe().getName();
        r.mealType = e.getMealType();
        r.mealsPerDay = e.getMealsPerDay();
        r.scalingFactor = e.getScalingFactor();
        r.calculatedKcal = e.getCalculatedKcal();
        r.calculatedProtein = e.getCalculatedProtein();
        r.calculatedCarbs = e.getCalculatedCarbs();
        r.calculatedFat = e.getCalculatedFat();
        return r;
    }
}

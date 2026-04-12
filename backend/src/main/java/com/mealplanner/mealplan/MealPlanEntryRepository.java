package com.mealplanner.mealplan;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MealPlanEntryRepository extends JpaRepository<MealPlanEntry, Long> {

    Optional<MealPlanEntry> findByIdAndMealPlanDayId(Long id, Long mealPlanDayId);

    List<MealPlanEntry> findByUserProfileId(Long userProfileId);

    void deleteByRecipe_Id(Long recipeId);
}

package com.mealplanner.mealplan;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MealPlanDayRepository extends JpaRepository<MealPlanDay, Long> {

    Optional<MealPlanDay> findByMealPlanIdAndDayNumber(Long mealPlanId, int dayNumber);

    List<MealPlanDay> findByMealPlanId(Long mealPlanId);

    /** Meal plan + entries + profiles + recipes (ingredients loaded lazily in same session). */
    @Query("""
            SELECT DISTINCT d FROM MealPlanDay d
            JOIN FETCH d.mealPlan m
            LEFT JOIN FETCH d.entries e
            LEFT JOIN FETCH e.userProfile
            LEFT JOIN FETCH e.recipe
            WHERE m.id = :mealPlanId AND d.dayNumber = :dayNumber
            """)
    Optional<MealPlanDay> findByMealPlanIdAndDayNumberWithDetails(
            @Param("mealPlanId") Long mealPlanId,
            @Param("dayNumber") int dayNumber);
}

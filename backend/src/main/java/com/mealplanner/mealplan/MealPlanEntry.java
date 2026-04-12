package com.mealplanner.mealplan;

import com.mealplanner.common.enums.MealType;
import com.mealplanner.profile.UserProfile;
import com.mealplanner.recipe.Recipe;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "meal_plan_entries")
@Getter
@Setter
@NoArgsConstructor
public class MealPlanEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "meal_plan_day_id", nullable = false)
    private MealPlanDay mealPlanDay;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_profile_id", nullable = false)
    private UserProfile userProfile;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipe_id", nullable = false)
    private Recipe recipe;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", nullable = false)
    private MealType mealType;

    @Column(name = "meals_per_day", nullable = false)
    private int mealsPerDay = 3;

    @Column(name = "scaling_factor", nullable = false)
    private double scalingFactor;

    @Column(name = "calculated_kcal", nullable = false)
    private int calculatedKcal;

    @Column(name = "calculated_protein", nullable = false)
    private double calculatedProtein;

    @Column(name = "calculated_carbs", nullable = false)
    private double calculatedCarbs;

    @Column(name = "calculated_fat", nullable = false)
    private double calculatedFat;
}

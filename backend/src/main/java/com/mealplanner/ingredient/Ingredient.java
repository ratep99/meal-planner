package com.mealplanner.ingredient;

import com.mealplanner.common.enums.IngredientCategory;
import com.mealplanner.common.enums.IngredientSource;
import com.mealplanner.common.enums.UnitType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ingredients")
@Getter
@Setter
@NoArgsConstructor
public class Ingredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "open_food_facts_id")
    private String openFoodFactsId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IngredientSource source;

    @Enumerated(EnumType.STRING)
    @Column(name = "unit_type", nullable = false)
    private UnitType unitType;

    @Column(name = "piece_weight_grams")
    private Double pieceWeightGrams;

    @Column(name = "kcal_per_100g", nullable = false)
    private double kcalPer100g;

    @Column(name = "protein_per_100g", nullable = false)
    private double proteinPer100g;

    @Column(name = "carbs_per_100g", nullable = false)
    private double carbsPer100g;

    @Column(name = "fat_per_100g", nullable = false)
    private double fatPer100g;

    @Column(name = "fiber_per_100g", nullable = false)
    private double fiberPer100g;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IngredientCategory category;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "manual_override", nullable = false)
    private boolean manualOverride = false;
}

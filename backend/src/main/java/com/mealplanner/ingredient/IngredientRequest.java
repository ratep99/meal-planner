package com.mealplanner.ingredient;

import com.mealplanner.common.enums.IngredientCategory;
import com.mealplanner.common.enums.IngredientSource;
import com.mealplanner.common.enums.UnitType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class IngredientRequest {

    @NotBlank
    private String name;

    @NotNull
    private IngredientSource source;

    @NotNull
    private UnitType unitType;

    // Required when unitType = PIECE
    private Double pieceWeightGrams;

    @Min(0)
    private double kcalPer100g;

    @Min(0)
    private double proteinPer100g;

    @Min(0)
    private double carbsPer100g;

    @Min(0)
    private double fatPer100g;

    @Min(0)
    private double fiberPer100g;

    @NotNull
    private IngredientCategory category;

    private boolean manualOverride = false;
}

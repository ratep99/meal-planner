package com.mealplanner.recipe;

import com.mealplanner.common.enums.QuantityUnit;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class RecipeIngredientRequest {

    @NotNull
    private Long ingredientId;

    @Positive
    private double quantity;

    @NotNull
    private QuantityUnit unit;

    private boolean optional = false;
}

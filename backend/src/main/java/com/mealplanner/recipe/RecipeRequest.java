package com.mealplanner.recipe;

import com.mealplanner.common.enums.MealType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
public class RecipeRequest {

    @NotBlank
    private String name;

    @NotNull
    private MealType mealType;

    private String description;

    private Integer prepTimeMin;
}

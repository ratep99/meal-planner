package com.mealplanner.recipe;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.mealplanner.common.enums.MealType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class RecipeResponse {

    private Long id;
    private String name;
    private MealType mealType;
    private String description;
    private Integer prepTimeMin;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    /** Stored image file name under {@code /uploads/recipes/} (currently {@code {id}.jpg}). */
    private String imageFilename;
    @JsonProperty("recipeIngredients")
    private List<RecipeIngredientResponse> recipeIngredients;
    /** Same shape as {@code GET /api/recipes/{id}/macros}. */
    private MacroResponse macros;

    public static RecipeResponse from(Recipe recipe) {
        List<RecipeIngredientResponse> lines = recipe.getIngredients().stream()
                .map(RecipeIngredientResponse::from)
                .toList();

        MacroTotals totals = MacroCalculator.sumRecipeMacros(recipe.getIngredients());

        RecipeResponse r = new RecipeResponse();
        r.id = recipe.getId();
        r.name = recipe.getName();
        r.mealType = recipe.getMealType();
        r.description = recipe.getDescription();
        r.prepTimeMin = recipe.getPrepTimeMin();
        r.createdAt = recipe.getCreatedAt();
        r.updatedAt = recipe.getUpdatedAt();
        r.imageFilename = recipe.getId() + ".jpg";
        r.recipeIngredients = lines;
        r.macros = MacroResponse.from(totals);
        return r;
    }
}

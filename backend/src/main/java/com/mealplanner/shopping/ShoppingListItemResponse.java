package com.mealplanner.shopping;

import com.mealplanner.common.enums.IngredientCategory;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
public class ShoppingListItemResponse {

    private Long id;
    private Long ingredientId;
    private String ingredientName;
    private IngredientCategory category;
    /** Display value — already in displayUnit (kg if ≥1000g was converted). */
    private double totalQuantity;
    private String displayUnit;
    /**
     * Raw per-plan quantities in grams (WEIGHT) or pieces (PIECE).
     * Key = mealPlanId.
     */
    private Map<Long, Double> quantityPerMealPlan;

    public static ShoppingListItemResponse from(ShoppingListItem item) {
        ShoppingListItemResponse r = new ShoppingListItemResponse();
        r.id = item.getId();
        r.ingredientId = item.getIngredient().getId();
        r.ingredientName = item.getIngredient().getName();
        r.category = item.getCategory();
        r.totalQuantity = item.getTotalQuantity();
        r.displayUnit = item.getDisplayUnit();
        r.quantityPerMealPlan = item.getQuantityPerMealPlan();
        return r;
    }
}

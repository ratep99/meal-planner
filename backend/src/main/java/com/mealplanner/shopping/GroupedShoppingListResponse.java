package com.mealplanner.shopping;

import com.mealplanner.common.enums.IngredientCategory;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class GroupedShoppingListResponse {

    private Long shoppingListId;
    private String name;
    private LocalDate dateRangeStart;
    private LocalDate dateRangeEnd;
    private List<Long> mealPlanIds;
    private List<CategoryGroup> groups;

    @Getter
    @Setter
    @NoArgsConstructor
    public static class CategoryGroup {
        private IngredientCategory category;
        private List<ShoppingListItemResponse> items;

        public CategoryGroup(IngredientCategory category, List<ShoppingListItemResponse> items) {
            this.category = category;
            this.items = items;
        }
    }
}

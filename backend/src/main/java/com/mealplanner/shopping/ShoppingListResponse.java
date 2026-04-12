package com.mealplanner.shopping;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class ShoppingListResponse {

    private Long id;
    private String name;
    private LocalDate dateRangeStart;
    private LocalDate dateRangeEnd;
    private List<Long> mealPlanIds;
    private List<ShoppingListItemResponse> items;
    private int totalItems;

    public static ShoppingListResponse from(ShoppingList list) {
        ShoppingListResponse r = new ShoppingListResponse();
        r.id = list.getId();
        r.name = list.getName();
        r.dateRangeStart = list.getDateRangeStart();
        r.dateRangeEnd = list.getDateRangeEnd();
        r.mealPlanIds = list.getMealPlans().stream()
                .map(p -> p.getId()).sorted().toList();
        r.items = list.getItems().stream()
                .map(ShoppingListItemResponse::from)
                .toList();
        r.totalItems = r.items.size();
        return r;
    }
}

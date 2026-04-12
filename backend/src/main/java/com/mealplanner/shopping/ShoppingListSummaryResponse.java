package com.mealplanner.shopping;

import com.mealplanner.mealplan.MealPlan;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

/** List row for {@code GET /api/shopping} — no line items (use {@code GET /api/shopping/{id}} for detail). */
@Getter
@Setter
@NoArgsConstructor
public class ShoppingListSummaryResponse {

    private Long id;
    private String name;
    private LocalDate dateRangeStart;
    private LocalDate dateRangeEnd;
    private List<Long> mealPlanIds;
    private int totalItems;

    public static ShoppingListSummaryResponse from(ShoppingList list) {
        ShoppingListSummaryResponse r = new ShoppingListSummaryResponse();
        r.id = list.getId();
        r.name = list.getName();
        r.dateRangeStart = list.getDateRangeStart();
        r.dateRangeEnd = list.getDateRangeEnd();
        r.mealPlanIds = list.getMealPlans().stream()
                .map(MealPlan::getId)
                .sorted()
                .toList();
        r.totalItems = list.getItems().size();
        return r;
    }
}

package com.mealplanner.mealplan;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class MealPlanDayResponse {

    private Long id;
    private int dayNumber;
    private List<MealPlanEntryResponse> entries;

    public static MealPlanDayResponse from(MealPlanDay day) {
        MealPlanDayResponse r = new MealPlanDayResponse();
        r.id = day.getId();
        r.dayNumber = day.getDayNumber();
        r.entries = day.getEntries().stream().map(MealPlanEntryResponse::from).toList();
        return r;
    }
}

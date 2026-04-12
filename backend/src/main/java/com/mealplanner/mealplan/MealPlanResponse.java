package com.mealplanner.mealplan;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class MealPlanResponse {

    private Long id;
    private String name;
    private int daysCount;
    private LocalDate startDate;
    private LocalDateTime createdAt;
    private List<Long> userProfileIds;
    private List<MealPlanDayResponse> days;

    public static MealPlanResponse from(MealPlan plan) {
        MealPlanResponse r = new MealPlanResponse();
        r.id = plan.getId();
        r.name = plan.getName();
        r.daysCount = plan.getDaysCount();
        r.startDate = plan.getStartDate();
        r.createdAt = plan.getCreatedAt();
        r.userProfileIds = plan.getUserProfiles().stream()
                .map(p -> p.getId())
                .sorted()
                .toList();
        r.days = plan.getDays().stream().map(MealPlanDayResponse::from).toList();
        return r;
    }
}

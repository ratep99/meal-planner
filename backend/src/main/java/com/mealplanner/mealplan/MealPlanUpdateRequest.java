package com.mealplanner.mealplan;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

/**
 * Partial update for {@code PUT /api/mealplans/{id}}. Omitted fields (null) are left unchanged.
 * {@code userProfileIds}: {@code null} = do not change profiles; empty list = clear all associations.
 */
@Getter
@Setter
@NoArgsConstructor
public class MealPlanUpdateRequest {

    private String name;

    @Min(1)
    @Max(14)
    private Integer daysCount;

    private LocalDate startDate;

    private List<Long> userProfileIds;

    @AssertTrue(message = "name must not be blank when provided")
    public boolean isNameValidWhenProvided() {
        return name == null || !name.isBlank();
    }
}

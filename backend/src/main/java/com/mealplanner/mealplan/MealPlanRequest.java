package com.mealplanner.mealplan;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class MealPlanRequest {

    @NotBlank
    private String name;

    @Min(1) @Max(14)
    private int daysCount = 7;

    @NotNull
    private LocalDate startDate;

    /** Profile IDs to associate with this plan. May be empty. */
    private List<Long> userProfileIds = new ArrayList<>();
}

package com.mealplanner.shopping;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class GenerateShoppingListRequest {

    @NotEmpty
    private List<Long> mealPlanIds;

    /** Optional. Auto-generated from date range if blank. */
    private String name;
}

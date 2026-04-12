package com.mealplanner.profile;

import com.mealplanner.common.enums.ActivityLevel;
import com.mealplanner.common.enums.Gender;
import com.mealplanner.common.enums.Goal;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Same inputs as {@link UserProfileRequest} except {@code displayName}, for live TDEE/macro preview without persisting.
 */
@Getter
@Setter
@NoArgsConstructor
public class TdeePreviewRequest {

    @NotNull
    private Gender gender;

    @Positive
    private int age;

    @Positive
    private int heightCm;

    @Positive
    private double weightKg;

    @NotNull
    private ActivityLevel activityLevel;

    @NotNull
    private Goal goal;

    /** g of protein per kg body weight. Defaults to 2.0. */
    private double proteinMultiplier = 2.0;

    /** g of fat per kg body weight. Defaults to 0.8. */
    private double fatMultiplier = 0.8;
}

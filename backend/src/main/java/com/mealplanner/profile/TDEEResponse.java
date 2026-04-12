package com.mealplanner.profile;

import com.mealplanner.common.enums.Goal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class TDEEResponse {

    private Long profileId;
    private String displayName;
    /** Goal used for the calorie adjustment (same as saved profile when {@link #profileId} is set). */
    private Goal goal;
    /**
     * Factor applied to {@link #tdee} to obtain the calorie budget for {@link #calculatedKcal} and carb math
     * ({@code CUT} 0.85, {@code MAINTAIN} 1.0, {@code BULK} 1.125).
     */
    private double goalCalorieMultiplier;
    private double bmr;
    /** Maintenance TDEE (BMR × activity), before goal — not the same as {@link #calculatedKcal} when goal ≠ MAINTAIN. */
    private double tdee;
    /** Rounded daily calorie target after goal adjustment — same semantics as {@code UserProfile.calculatedKcal}. */
    private int calculatedKcal;
    private int targetProtein;
    private int targetCarbs;
    private int targetFat;
    private double proteinMultiplier;
    private double fatMultiplier;

    public static TDEEResponse from(UserProfile profile, TDEEResult result) {
        TDEEResponse r = new TDEEResponse();
        r.profileId = profile.getId();
        r.displayName = profile.getDisplayName();
        r.goal = profile.getGoal();
        r.goalCalorieMultiplier = profile.getGoal().getCalorieMultiplier();
        r.bmr = result.getRawBmr();
        r.tdee = result.getRawTdee();
        r.calculatedKcal = result.getKcal();
        r.targetProtein = result.getProtein();
        r.targetCarbs = result.getCarbs();
        r.targetFat = result.getFat();
        r.proteinMultiplier = profile.getProteinMultiplier();
        r.fatMultiplier = profile.getFatMultiplier();
        return r;
    }
}

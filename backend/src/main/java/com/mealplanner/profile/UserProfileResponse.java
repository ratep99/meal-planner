package com.mealplanner.profile;

import com.mealplanner.common.enums.ActivityLevel;
import com.mealplanner.common.enums.Gender;
import com.mealplanner.common.enums.Goal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UserProfileResponse {

    private Long id;
    private String displayName;
    private Gender gender;
    private int age;
    private int heightCm;
    private double weightKg;
    private ActivityLevel activityLevel;
    private Goal goal;
    private double proteinMultiplier;
    private double fatMultiplier;
    private int calculatedKcal;
    private int targetProtein;
    private int targetCarbs;
    private int targetFat;

    public static UserProfileResponse from(UserProfile p) {
        UserProfileResponse r = new UserProfileResponse();
        r.id = p.getId();
        r.displayName = p.getDisplayName();
        r.gender = p.getGender();
        r.age = p.getAge();
        r.heightCm = p.getHeightCm();
        r.weightKg = p.getWeightKg();
        r.activityLevel = p.getActivityLevel();
        r.goal = p.getGoal();
        r.proteinMultiplier = p.getProteinMultiplier();
        r.fatMultiplier = p.getFatMultiplier();
        r.calculatedKcal = p.getCalculatedKcal();
        r.targetProtein = p.getTargetProtein();
        r.targetCarbs = p.getTargetCarbs();
        r.targetFat = p.getTargetFat();
        return r;
    }
}

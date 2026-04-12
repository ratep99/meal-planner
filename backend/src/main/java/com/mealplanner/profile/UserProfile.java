package com.mealplanner.profile;

import com.mealplanner.common.enums.ActivityLevel;
import com.mealplanner.common.enums.Gender;
import com.mealplanner.common.enums.Goal;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_profiles")
@Getter
@Setter
@NoArgsConstructor
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Gender gender;

    @Column(nullable = false)
    private int age;

    @Column(name = "height_cm", nullable = false)
    private int heightCm;

    @Column(name = "weight_kg", nullable = false)
    private double weightKg;

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_level", nullable = false)
    private ActivityLevel activityLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Goal goal;

    // Adjustable macro multipliers (g per kg of body weight)
    @Column(name = "protein_multiplier", nullable = false)
    private double proteinMultiplier = 2.0;

    @Column(name = "fat_multiplier", nullable = false)
    private double fatMultiplier = 0.8;

    @Column(name = "calculated_kcal", nullable = false)
    private int calculatedKcal;

    @Column(name = "target_protein", nullable = false)
    private int targetProtein;

    @Column(name = "target_carbs", nullable = false)
    private int targetCarbs;

    @Column(name = "target_fat", nullable = false)
    private int targetFat;
}

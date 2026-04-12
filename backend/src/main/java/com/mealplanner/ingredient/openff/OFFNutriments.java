package com.mealplanner.ingredient.openff;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class OFFNutriments {

    @JsonProperty("energy-kcal_100g")
    private Double kcalPer100g;

    @JsonProperty("proteins_100g")
    private Double proteinPer100g;

    @JsonProperty("carbohydrates_100g")
    private Double carbsPer100g;

    @JsonProperty("fat_100g")
    private Double fatPer100g;

    @JsonProperty("fiber_100g")
    private Double fiberPer100g;
}

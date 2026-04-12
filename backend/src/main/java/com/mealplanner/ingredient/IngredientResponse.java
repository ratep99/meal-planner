package com.mealplanner.ingredient;

import com.mealplanner.common.enums.IngredientCategory;
import com.mealplanner.common.enums.IngredientSource;
import com.mealplanner.common.enums.UnitType;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class IngredientResponse {

    private Long id;
    private String name;
    private String openFoodFactsId;
    private IngredientSource source;
    private UnitType unitType;
    private Double pieceWeightGrams;
    private double kcalPer100g;
    private double proteinPer100g;
    private double carbsPer100g;
    private double fatPer100g;
    private double fiberPer100g;
    private IngredientCategory category;
    private LocalDateTime createdAt;
    private boolean manualOverride;

    public static IngredientResponse from(Ingredient i) {
        IngredientResponse r = new IngredientResponse();
        r.id = i.getId();
        r.name = i.getName();
        r.openFoodFactsId = i.getOpenFoodFactsId();
        r.source = i.getSource();
        r.unitType = i.getUnitType();
        r.pieceWeightGrams = i.getPieceWeightGrams();
        r.kcalPer100g = i.getKcalPer100g();
        r.proteinPer100g = i.getProteinPer100g();
        r.carbsPer100g = i.getCarbsPer100g();
        r.fatPer100g = i.getFatPer100g();
        r.fiberPer100g = i.getFiberPer100g();
        r.category = i.getCategory();
        r.createdAt = i.getCreatedAt();
        r.manualOverride = i.isManualOverride();
        return r;
    }
}

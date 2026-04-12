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
public class OFFProduct {

    // Barcode — used as openFoodFactsId
    private String code;

    @JsonProperty("product_name")
    private String productName;

    private OFFNutriments nutriments;
}

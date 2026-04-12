package com.mealplanner.shopping;

import com.mealplanner.common.enums.IngredientCategory;
import com.mealplanner.ingredient.Ingredient;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "shopping_list_items")
@Getter
@Setter
@NoArgsConstructor
public class ShoppingListItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shopping_list_id", nullable = false)
    private ShoppingList shoppingList;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    // Per-meal-plan quantity breakdown: mealPlanId → quantity
    @ElementCollection
    @CollectionTable(
        name = "shopping_list_item_quantities",
        joinColumns = @JoinColumn(name = "shopping_list_item_id")
    )
    @MapKeyColumn(name = "meal_plan_id")
    @Column(name = "quantity")
    private Map<Long, Double> quantityPerMealPlan = new HashMap<>();

    @Column(name = "total_quantity", nullable = false)
    private double totalQuantity;

    @Column(name = "display_unit", nullable = false)
    private String displayUnit;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IngredientCategory category;
}

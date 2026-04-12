package com.mealplanner.shopping;

import com.mealplanner.common.enums.IngredientCategory;
import com.mealplanner.common.enums.UnitType;
import com.mealplanner.common.exception.ResourceNotFoundException;
import com.mealplanner.ingredient.Ingredient;
import com.mealplanner.mealplan.MealPlan;
import com.mealplanner.mealplan.MealPlanDay;
import com.mealplanner.mealplan.MealPlanEntry;
import com.mealplanner.mealplan.MealPlanRepository;
import com.mealplanner.mealplan.ScaledIngredient;
import com.mealplanner.mealplan.ScalingCalculator;
import com.mealplanner.recipe.RecipeIngredient;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShoppingListService {

    private final ShoppingListRepository shoppingListRepository;
    private final MealPlanRepository mealPlanRepository;

    // =========================================================================
    // Generate
    // =========================================================================

    /**
     * Builds a shopping list from one or more meal plans: scales each recipe
     * ingredient, sums by ingredient (never duplicated), applies g/kg/kom display rules.
     */
    @Transactional
    public ShoppingListResponse generateFromMealPlans(List<Long> mealPlanIds) {
        return generateFromMealPlans(mealPlanIds, null);
    }

    @Transactional
    public ShoppingListResponse generate(GenerateShoppingListRequest request) {
        return generateFromMealPlans(request.getMealPlanIds(), request.getName());
    }

    private ShoppingListResponse generateFromMealPlans(List<Long> mealPlanIds, String optionalName) {
        List<MealPlan> plans = mealPlanIds.stream()
                .map(id -> mealPlanRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException("MealPlan", id)))
                .toList();

        // --- Accumulate scaled quantities ---
        // ingredientId → ingredient entity (for building items later)
        Map<Long, Ingredient> ingredientMap = new LinkedHashMap<>();
        // ingredientId → (mealPlanId → raw quantity in grams or pieces)
        Map<Long, Map<Long, Double>> quantities = new LinkedHashMap<>();

        for (MealPlan plan : plans) {
            for (MealPlanDay day : plan.getDays()) {
                for (MealPlanEntry entry : day.getEntries()) {
                    for (RecipeIngredient ri : entry.getRecipe().getIngredients()) {
                        ScaledIngredient scaled = ScalingCalculator.scaleIngredient(
                                ri, entry.getScalingFactor());
                        Long ingId = ri.getIngredient().getId();
                        ingredientMap.putIfAbsent(ingId, ri.getIngredient());
                        quantities.computeIfAbsent(ingId, k -> new HashMap<>())
                                .merge(plan.getId(), scaled.getScaledQuantity(), Double::sum);
                    }
                }
            }
        }

        // --- Build date range ---
        LocalDate start = plans.stream()
                .map(MealPlan::getStartDate).min(LocalDate::compareTo).orElse(LocalDate.now());
        LocalDate end = plans.stream()
                .map(p -> p.getStartDate().plusDays(p.getDaysCount() - 1))
                .max(LocalDate::compareTo).orElse(LocalDate.now());

        // --- Name ---
        String name = (optionalName != null && !optionalName.isBlank())
                ? optionalName
                : "Shopping List " + start + " – " + end;

        // --- Build entity ---
        ShoppingList list = new ShoppingList();
        list.setName(name);
        list.setDateRangeStart(start);
        list.setDateRangeEnd(end);
        list.setMealPlans(new HashSet<>(plans));

        for (Map.Entry<Long, Map<Long, Double>> acc : quantities.entrySet()) {
            Ingredient ingredient = ingredientMap.get(acc.getKey());
            Map<Long, Double> perPlan = acc.getValue();
            double rawTotal = perPlan.values().stream().mapToDouble(Double::doubleValue).sum();

            String displayUnit;
            double displayQuantity;

            if (ingredient.getUnitType() == UnitType.PIECE) {
                displayUnit = "kom";
                displayQuantity = rawTotal;
            } else if (rawTotal >= 1000) {
                displayUnit = "kg";
                displayQuantity = rawTotal / 1000.0;
            } else {
                displayUnit = "g";
                displayQuantity = rawTotal;
            }

            ShoppingListItem item = new ShoppingListItem();
            item.setShoppingList(list);
            item.setIngredient(ingredient);
            item.setQuantityPerMealPlan(new HashMap<>(perPlan));
            item.setTotalQuantity(displayQuantity);
            item.setDisplayUnit(displayUnit);
            item.setCategory(ingredient.getCategory());
            list.getItems().add(item);
        }

        return ShoppingListResponse.from(shoppingListRepository.save(list));
    }

    // =========================================================================
    // Read
    // =========================================================================

    @Transactional(readOnly = true)
    public List<ShoppingListSummaryResponse> findAllSummaries() {
        return shoppingListRepository.findAll(Sort.by(Sort.Direction.DESC, "id")).stream()
                .map(ShoppingListSummaryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ShoppingListResponse findById(Long id) {
        return ShoppingListResponse.from(findOrThrow(id));
    }

    @Transactional(readOnly = true)
    public GroupedShoppingListResponse findGroupedById(Long id) {
        ShoppingList list = findOrThrow(id);

        // Sort categories in a sensible display order
        List<IngredientCategory> orderedCategories = Arrays.asList(IngredientCategory.values());

        Map<IngredientCategory, List<ShoppingListItemResponse>> byCategory = list.getItems().stream()
                .sorted(Comparator.comparing(i -> i.getIngredient().getName()))
                .collect(Collectors.groupingBy(
                        ShoppingListItem::getCategory,
                        Collectors.mapping(ShoppingListItemResponse::from, Collectors.toList())
                ));

        List<GroupedShoppingListResponse.CategoryGroup> groups = orderedCategories.stream()
                .filter(byCategory::containsKey)
                .map(cat -> new GroupedShoppingListResponse.CategoryGroup(cat, byCategory.get(cat)))
                .toList();

        GroupedShoppingListResponse r = new GroupedShoppingListResponse();
        r.setShoppingListId(list.getId());
        r.setName(list.getName());
        r.setDateRangeStart(list.getDateRangeStart());
        r.setDateRangeEnd(list.getDateRangeEnd());
        r.setMealPlanIds(list.getMealPlans().stream().map(p -> p.getId()).sorted().toList());
        r.setGroups(groups);
        return r;
    }

    // =========================================================================
    // Delete
    // =========================================================================

    @Transactional
    public void delete(Long id) {
        if (!shoppingListRepository.existsById(id)) {
            throw new ResourceNotFoundException("ShoppingList", id);
        }
        shoppingListRepository.deleteById(id);
    }

    // =========================================================================
    // Helper
    // =========================================================================

    private ShoppingList findOrThrow(Long id) {
        return shoppingListRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShoppingList", id));
    }
}

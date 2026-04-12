package com.mealplanner.ingredient;

import com.mealplanner.common.exception.ResourceNotFoundException;
import com.mealplanner.common.enums.IngredientSource;
import com.mealplanner.ingredient.openff.OFFProduct;
import com.mealplanner.ingredient.openff.OpenFoodFactsClient;
import com.mealplanner.ingredient.openff.OpenFoodFactsMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class IngredientService {

    private final IngredientRepository repository;
    private final OpenFoodFactsClient offClient;
    private final OpenFoodFactsMapper offMapper;

    public List<IngredientResponse> search(String query) {
        if (query == null || query.isBlank()) {
            return repository.findAll().stream().map(IngredientResponse::from).toList();
        }
        return repository.findByNameContainingIgnoreCase(query).stream()
                .map(IngredientResponse::from)
                .toList();
    }

    @Transactional
    public IngredientResponse create(IngredientRequest request) {
        Ingredient ingredient = applyRequest(new Ingredient(), request);
        return IngredientResponse.from(repository.save(ingredient));
    }

    @Transactional
    public IngredientResponse update(Long id, IngredientRequest request) {
        Ingredient ingredient = findOrThrow(id);
        applyRequest(ingredient, request);
        return IngredientResponse.from(repository.save(ingredient));
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Ingredient", id);
        }
        repository.deleteById(id);
    }

    /**
     * Searches Open Food Facts and imports matching products.
     * Already-imported products (matched by openFoodFactsId) are returned as-is.
     * Products with manualOverride=true are never overwritten.
     */
    @Transactional
    public List<IngredientResponse> importFromOpenFoodFacts(String query) {
        List<OFFProduct> products = offClient.searchProducts(query);

        return products.stream()
                .filter(p -> p.getCode() != null && !p.getCode().isBlank())
                .filter(p -> p.getProductName() != null && !p.getProductName().isBlank())
                .map(p -> {
                    return repository.findByOpenFoodFactsId(p.getCode())
                            .orElseGet(() -> repository.save(offMapper.toIngredient(p)));
                })
                .map(IngredientResponse::from)
                .toList();
    }

    // --- helpers ---

    private Ingredient applyRequest(Ingredient ingredient, IngredientRequest r) {
        ingredient.setName(r.getName());
        ingredient.setSource(r.getSource() != null ? r.getSource() : IngredientSource.MANUAL);
        ingredient.setUnitType(r.getUnitType());
        ingredient.setPieceWeightGrams(r.getPieceWeightGrams());
        ingredient.setKcalPer100g(r.getKcalPer100g());
        ingredient.setProteinPer100g(r.getProteinPer100g());
        ingredient.setCarbsPer100g(r.getCarbsPer100g());
        ingredient.setFatPer100g(r.getFatPer100g());
        ingredient.setFiberPer100g(r.getFiberPer100g());
        ingredient.setCategory(r.getCategory());
        ingredient.setManualOverride(r.isManualOverride());
        return ingredient;
    }

    private Ingredient findOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ingredient", id));
    }
}

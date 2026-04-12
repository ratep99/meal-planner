package com.mealplanner.recipe;

import com.mealplanner.common.enums.MealType;
import com.mealplanner.common.exception.ResourceNotFoundException;
import com.mealplanner.ingredient.Ingredient;
import com.mealplanner.ingredient.IngredientRepository;
import com.mealplanner.mealplan.MealPlanEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RecipeService {

    private final RecipeRepository recipeRepository;
    private final IngredientRepository ingredientRepository;
    private final MealPlanEntryRepository mealPlanEntryRepository;

    @Value("${app.upload.dir}")
    private String uploadDir;

    // -------------------------------------------------------------------------
    // Recipe CRUD
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<RecipeResponse> findAll(String search, MealType mealType) {
        List<Recipe> recipes;
        if (search != null && !search.isBlank() && mealType != null) {
            recipes = recipeRepository.findByNameContainingIgnoreCaseAndMealType(search, mealType);
        } else if (search != null && !search.isBlank()) {
            recipes = recipeRepository.findByNameContainingIgnoreCase(search);
        } else if (mealType != null) {
            recipes = recipeRepository.findByMealType(mealType);
        } else {
            recipes = recipeRepository.findAll();
        }
        return recipes.stream().map(RecipeResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public RecipeResponse findById(Long id) {
        return RecipeResponse.from(findOrThrow(id));
    }

    @Transactional
    public RecipeResponse create(RecipeRequest request) {
        Recipe recipe = new Recipe();
        applyRequest(recipe, request);
        return RecipeResponse.from(recipeRepository.save(recipe));
    }

    @Transactional
    public RecipeResponse update(Long id, RecipeRequest request) {
        Recipe recipe = findOrThrow(id);
        applyRequest(recipe, request);
        recipe.setUpdatedAt(LocalDateTime.now());
        return RecipeResponse.from(recipeRepository.save(recipe));
    }

    @Transactional
    public void delete(Long id) {
        if (!recipeRepository.existsById(id)) {
            throw new ResourceNotFoundException("Recipe", id);
        }
        // meal_plan_entries.recipe_id has no DB cascade — remove slots first
        mealPlanEntryRepository.deleteByRecipe_Id(id);
        try {
            Path img = Paths.get(uploadDir, "recipes", id + ".jpg");
            Files.deleteIfExists(img);
        } catch (IOException ignored) {
            // best-effort cleanup; recipe row still removed
        }
        recipeRepository.deleteById(id);
    }

    // -------------------------------------------------------------------------
    // Macro endpoint
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public MacroResponse getMacros(Long id) {
        Recipe recipe = findOrThrow(id);
        MacroTotals totals = MacroCalculator.sumRecipeMacros(recipe.getIngredients());
        return MacroResponse.from(totals);
    }

    // -------------------------------------------------------------------------
    // RecipeIngredient mutations — each triggers macro recalculation implicitly
    // because RecipeResponse.from() always computes fresh totals
    // -------------------------------------------------------------------------

    @Transactional
    public RecipeResponse addIngredient(Long recipeId, RecipeIngredientRequest request) {
        Recipe recipe = findOrThrow(recipeId);
        Ingredient ingredient = findIngredientOrThrow(request.getIngredientId());

        RecipeIngredient ri = new RecipeIngredient();
        ri.setRecipe(recipe);
        ri.setIngredient(ingredient);
        ri.setQuantity(request.getQuantity());
        ri.setUnit(request.getUnit());
        ri.setOptional(request.isOptional());

        recipe.getIngredients().add(ri);
        recipe.setUpdatedAt(LocalDateTime.now());
        return RecipeResponse.from(recipeRepository.save(recipe));
    }

    @Transactional
    public RecipeResponse updateIngredient(Long recipeId, Long ingredientEntryId, RecipeIngredientRequest request) {
        Recipe recipe = findOrThrow(recipeId);

        RecipeIngredient ri = recipe.getIngredients().stream()
                .filter(r -> r.getId().equals(ingredientEntryId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "RecipeIngredient " + ingredientEntryId + " not found on recipe " + recipeId));

        // Allow swapping the ingredient itself
        if (!ri.getIngredient().getId().equals(request.getIngredientId())) {
            ri.setIngredient(findIngredientOrThrow(request.getIngredientId()));
        }
        ri.setQuantity(request.getQuantity());
        ri.setUnit(request.getUnit());
        ri.setOptional(request.isOptional());

        recipe.setUpdatedAt(LocalDateTime.now());
        return RecipeResponse.from(recipeRepository.save(recipe));
    }

    @Transactional
    public void deleteIngredient(Long recipeId, Long ingredientEntryId) {
        Recipe recipe = findOrThrow(recipeId);
        boolean removed = recipe.getIngredients()
                .removeIf(ri -> ri.getId().equals(ingredientEntryId));
        if (!removed) {
            throw new ResourceNotFoundException(
                    "RecipeIngredient " + ingredientEntryId + " not found on recipe " + recipeId);
        }
        recipe.setUpdatedAt(LocalDateTime.now());
        recipeRepository.save(recipe);
    }

    // -------------------------------------------------------------------------
    // Image upload
    // -------------------------------------------------------------------------

    @Transactional
    public void saveImage(Long recipeId, MultipartFile file) {
        if (!recipeRepository.existsById(recipeId)) {
            throw new ResourceNotFoundException("Recipe", recipeId);
        }
        try {
            Path dir = Paths.get(uploadDir, "recipes");
            Files.createDirectories(dir);
            Path dest = dir.resolve(recipeId + ".jpg");
            Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store image for recipe " + recipeId, e);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Recipe findOrThrow(Long id) {
        return recipeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recipe", id));
    }

    private Ingredient findIngredientOrThrow(Long id) {
        return ingredientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ingredient", id));
    }

    private void applyRequest(Recipe recipe, RecipeRequest request) {
        recipe.setName(request.getName());
        recipe.setMealType(request.getMealType());
        recipe.setDescription(request.getDescription());
        recipe.setPrepTimeMin(request.getPrepTimeMin());
    }
}

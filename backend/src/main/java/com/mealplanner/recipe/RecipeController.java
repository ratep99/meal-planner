package com.mealplanner.recipe;

import com.mealplanner.common.enums.MealType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/recipes")
@RequiredArgsConstructor
public class RecipeController {

    private final RecipeService service;

    @GetMapping
    public List<RecipeResponse> findAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) MealType mealType) {
        return service.findAll(search, mealType);
    }

    @GetMapping("/{id}")
    public RecipeResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @GetMapping("/{id}/macros")
    public MacroResponse getMacros(@PathVariable Long id) {
        return service.getMacros(id);
    }

    @PostMapping
    public ResponseEntity<RecipeResponse> create(@Valid @RequestBody RecipeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    public RecipeResponse update(@PathVariable Long id, @Valid @RequestBody RecipeRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/ingredients")
    public ResponseEntity<RecipeResponse> addIngredient(
            @PathVariable Long id,
            @Valid @RequestBody RecipeIngredientRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addIngredient(id, request));
    }

    @PutMapping("/{id}/ingredients/{iid}")
    public RecipeResponse updateIngredient(
            @PathVariable Long id,
            @PathVariable Long iid,
            @Valid @RequestBody RecipeIngredientRequest request) {
        return service.updateIngredient(id, iid, request);
    }

    @DeleteMapping("/{id}/ingredients/{iid}")
    public ResponseEntity<Void> deleteIngredient(@PathVariable Long id, @PathVariable Long iid) {
        service.deleteIngredient(id, iid);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> uploadImage(
            @PathVariable Long id,
            @RequestParam("image") MultipartFile image) {
        service.saveImage(id, image);
        return ResponseEntity.ok().build();
    }
}

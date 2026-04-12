package com.mealplanner.mealplan;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mealplans")
@RequiredArgsConstructor
public class MealPlanController {

    private final MealPlanService service;

    @GetMapping
    public List<MealPlanResponse> findAll() {
        return service.findAll();
    }

    @PostMapping
    public ResponseEntity<MealPlanResponse> create(@Valid @RequestBody MealPlanRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @GetMapping("/{id}")
    public MealPlanResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PutMapping("/{id}")
    public MealPlanResponse update(@PathVariable Long id, @Valid @RequestBody MealPlanUpdateRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/days/{day}/entries")
    public ResponseEntity<MealPlanEntryResponse> assignRecipe(
            @PathVariable Long id,
            @PathVariable int day,
            @Valid @RequestBody MealPlanEntryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.assignRecipe(id, day, request));
    }

    @PutMapping("/{id}/days/{day}/entries/{eid}")
    public MealPlanEntryResponse updateEntry(
            @PathVariable Long id,
            @PathVariable int day,
            @PathVariable Long eid,
            @Valid @RequestBody MealPlanEntryRequest request) {
        return service.updateEntry(id, day, eid, request);
    }

    @DeleteMapping("/{id}/days/{day}/entries/{eid}")
    public ResponseEntity<Void> deleteEntry(
            @PathVariable Long id,
            @PathVariable int day,
            @PathVariable Long eid) {
        service.deleteEntry(id, day, eid);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/summary")
    public MealPlanSummaryResponse getSummary(@PathVariable Long id) {
        return service.getMealPlanSummary(id);
    }
}

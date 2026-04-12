package com.mealplanner.shopping;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shopping")
@RequiredArgsConstructor
public class ShoppingListController {

    private final ShoppingListService service;

    @GetMapping
    public List<ShoppingListSummaryResponse> findAll() {
        return service.findAllSummaries();
    }

    @PostMapping
    public ResponseEntity<ShoppingListResponse> generate(
            @Valid @RequestBody GenerateShoppingListRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.generate(request));
    }

    @GetMapping("/{id}")
    public ShoppingListResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @GetMapping("/{id}/grouped")
    public GroupedShoppingListResponse findGrouped(@PathVariable Long id) {
        return service.findGroupedById(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}

package com.mealplanner.profile;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/profiles")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService service;

    @GetMapping
    public List<UserProfileResponse> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public UserProfileResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<UserProfileResponse> create(@Valid @RequestBody UserProfileRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    /**
     * Live TDEE and macro targets from draft form fields — identical logic to persisted profile calculation.
     * Response {@code profileId} is null; {@code tdee} is maintenance (pre-goal); {@code calculatedKcal} is post-goal.
     */
    @PostMapping("/tdee-preview")
    public TDEEResponse previewTdee(@Valid @RequestBody TdeePreviewRequest request) {
        return service.previewTdee(request);
    }

    @PutMapping("/{id}")
    public UserProfileResponse update(@PathVariable Long id, @Valid @RequestBody UserProfileRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/tdee")
    public TDEEResponse getTdee(@PathVariable Long id) {
        return service.getTdee(id);
    }
}

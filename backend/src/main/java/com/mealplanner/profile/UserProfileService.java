package com.mealplanner.profile;

import com.mealplanner.common.exception.ResourceNotFoundException;
import com.mealplanner.mealplan.MealPlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository profileRepository;
    private final MealPlanService mealPlanService;

    @Transactional(readOnly = true)
    public List<UserProfileResponse> findAll() {
        return profileRepository.findAll().stream()
                .map(UserProfileResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserProfileResponse findById(Long id) {
        return UserProfileResponse.from(findOrThrow(id));
    }

    @Transactional
    public UserProfileResponse create(UserProfileRequest request) {
        UserProfile profile = new UserProfile();
        applyRequest(profile, request);
        recalculate(profile);
        return UserProfileResponse.from(profileRepository.save(profile));
    }

    @Transactional
    public UserProfileResponse update(Long id, UserProfileRequest request) {
        UserProfile profile = findOrThrow(id);
        applyRequest(profile, request);
        recalculate(profile);
        UserProfile saved = profileRepository.save(profile);
        mealPlanService.refreshEntriesForUserProfile(saved.getId());
        return UserProfileResponse.from(saved);
    }

    @Transactional
    public void delete(Long id) {
        if (!profileRepository.existsById(id)) {
            throw new ResourceNotFoundException("UserProfile", id);
        }
        profileRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public TDEEResponse getTdee(Long id) {
        UserProfile profile = findOrThrow(id);
        TDEEResult result = TDEECalculator.calculate(profile);
        return TDEEResponse.from(profile, result);
    }

    /**
     * Same calculation as save path — {@code profileId} is null; use for form preview without a persisted profile.
     */
    @Transactional(readOnly = true)
    public TDEEResponse previewTdee(TdeePreviewRequest request) {
        UserProfile stub = new UserProfile();
        stub.setDisplayName("");
        stub.setGender(request.getGender());
        stub.setAge(request.getAge());
        stub.setHeightCm(request.getHeightCm());
        stub.setWeightKg(request.getWeightKg());
        stub.setActivityLevel(request.getActivityLevel());
        stub.setGoal(request.getGoal());
        stub.setProteinMultiplier(request.getProteinMultiplier());
        stub.setFatMultiplier(request.getFatMultiplier());
        TDEEResult result = TDEECalculator.calculate(stub);
        return TDEEResponse.from(stub, result);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private void applyRequest(UserProfile profile, UserProfileRequest r) {
        profile.setDisplayName(r.getDisplayName());
        profile.setGender(r.getGender());
        profile.setAge(r.getAge());
        profile.setHeightCm(r.getHeightCm());
        profile.setWeightKg(r.getWeightKg());
        profile.setActivityLevel(r.getActivityLevel());
        profile.setGoal(r.getGoal());
        profile.setProteinMultiplier(r.getProteinMultiplier());
        profile.setFatMultiplier(r.getFatMultiplier());
    }

    /** Recalculates TDEE and writes results back into the entity. Always called on save. */
    private void recalculate(UserProfile profile) {
        TDEEResult result = TDEECalculator.calculate(profile);
        profile.setCalculatedKcal(result.getKcal());
        profile.setTargetProtein(result.getProtein());
        profile.setTargetCarbs(result.getCarbs());
        profile.setTargetFat(result.getFat());
    }

    private UserProfile findOrThrow(Long id) {
        return profileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("UserProfile", id));
    }
}

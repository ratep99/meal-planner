package com.mealplanner.mealplan;

import com.mealplanner.common.exception.ResourceNotFoundException;
import com.mealplanner.profile.UserProfile;
import com.mealplanner.profile.UserProfileRepository;
import com.mealplanner.recipe.MacroTotals;
import com.mealplanner.recipe.Recipe;
import com.mealplanner.recipe.RecipeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MealPlanService {

    private final MealPlanRepository mealPlanRepository;
    private final MealPlanDayRepository dayRepository;
    private final MealPlanEntryRepository mealPlanEntryRepository;
    private final UserProfileRepository profileRepository;
    private final RecipeRepository recipeRepository;

    // =========================================================================
    // MealPlan CRUD
    // =========================================================================

    @Transactional(readOnly = true)
    public List<MealPlanResponse> findAll() {
        return mealPlanRepository.findAll().stream().map(MealPlanResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public MealPlanResponse findById(Long id) {
        return MealPlanResponse.from(findOrThrow(id));
    }

    @Transactional
    public MealPlanResponse create(MealPlanRequest request) {
        MealPlan plan = new MealPlan();
        applyRequest(plan, request);
        addDays(plan, 1, request.getDaysCount());
        return MealPlanResponse.from(mealPlanRepository.save(plan));
    }

    @Transactional
    public MealPlanResponse update(Long id, MealPlanUpdateRequest request) {
        MealPlan plan = findOrThrow(id);

        int oldCount = plan.getDaysCount();
        Integer requestedDays = request.getDaysCount();
        int newCount = requestedDays != null ? requestedDays : oldCount;

        applyPartialUpdate(plan, request);

        if (requestedDays != null && newCount > oldCount) {
            addDays(plan, oldCount + 1, newCount);
        } else if (requestedDays != null && newCount < oldCount) {
            // orphanRemoval cascades deletion of entries on removed days
            plan.getDays().removeIf(d -> d.getDayNumber() > newCount);
        }

        return MealPlanResponse.from(mealPlanRepository.save(plan));
    }

    @Transactional
    public void delete(Long id) {
        if (!mealPlanRepository.existsById(id)) {
            throw new ResourceNotFoundException("MealPlan", id);
        }
        mealPlanRepository.deleteById(id);
    }

    // =========================================================================
    // Entry management
    // =========================================================================

    /**
     * Assigns a recipe to a day/meal slot for a specific user profile.
     * If the same profile already has an entry for this (day, mealType), it is
     * replaced — each slot holds at most one recipe per user.
     */
    @Transactional
    public MealPlanEntryResponse assignRecipe(Long mealPlanId, int dayNumber, MealPlanEntryRequest request) {
        MealPlanDay day = findDayOrThrow(mealPlanId, dayNumber);
        UserProfile profile = findProfileOrThrow(request.getUserProfileId());
        Recipe recipe = findRecipeOrThrow(request.getRecipeId());

        // Replace existing entry for the same user + mealType slot
        day.getEntries().removeIf(e ->
                e.getUserProfile().getId().equals(profile.getId())
                && e.getMealType() == request.getMealType());

        double scalingFactor = ScalingCalculator.calculateScalingFactor(
                profile, recipe, request.getMealsPerDay());
        MacroTotals macros = ScalingCalculator.sumScaledMacros(
                recipe.getIngredients(), scalingFactor);

        MealPlanEntry entry = new MealPlanEntry();
        entry.setMealPlanDay(day);
        entry.setUserProfile(profile);
        entry.setRecipe(recipe);
        entry.setMealType(request.getMealType());
        entry.setMealsPerDay(request.getMealsPerDay());
        entry.setScalingFactor(scalingFactor);
        entry.setCalculatedKcal((int) Math.round(macros.getKcal()));
        entry.setCalculatedProtein(macros.getProtein());
        entry.setCalculatedCarbs(macros.getCarbs());
        entry.setCalculatedFat(macros.getFat());

        day.getEntries().add(entry);
        // Saving via the day's parent plan (cascade) to keep the aggregate consistent
        mealPlanRepository.save(day.getMealPlan());

        // Reload the saved entry by querying the persisted state
        MealPlanEntry saved = day.getEntries().stream()
                .filter(e -> e.getUserProfile().getId().equals(profile.getId())
                        && e.getMealType() == request.getMealType())
                .findFirst()
                .orElseThrow();
        return MealPlanEntryResponse.from(saved);
    }

    @Transactional
    public MealPlanEntryResponse updateEntry(Long mealPlanId, int dayNumber, Long entryId,
                                             MealPlanEntryRequest request) {
        MealPlanDay day = findDayOrThrow(mealPlanId, dayNumber);
        MealPlanEntry entry = day.getEntries().stream()
                .filter(e -> e.getId().equals(entryId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "MealPlanEntry " + entryId + " not found on day " + dayNumber));

        UserProfile profile = findProfileOrThrow(request.getUserProfileId());
        Recipe recipe = findRecipeOrThrow(request.getRecipeId());

        double scalingFactor = ScalingCalculator.calculateScalingFactor(
                profile, recipe, request.getMealsPerDay());
        MacroTotals macros = ScalingCalculator.sumScaledMacros(
                recipe.getIngredients(), scalingFactor);

        entry.setUserProfile(profile);
        entry.setRecipe(recipe);
        entry.setMealType(request.getMealType());
        entry.setMealsPerDay(request.getMealsPerDay());
        entry.setScalingFactor(scalingFactor);
        entry.setCalculatedKcal((int) Math.round(macros.getKcal()));
        entry.setCalculatedProtein(macros.getProtein());
        entry.setCalculatedCarbs(macros.getCarbs());
        entry.setCalculatedFat(macros.getFat());

        mealPlanRepository.save(day.getMealPlan());
        return MealPlanEntryResponse.from(entry);
    }

    @Transactional
    public void deleteEntry(Long mealPlanId, int dayNumber, Long entryId) {
        MealPlanDay day = findDayOrThrow(mealPlanId, dayNumber);
        boolean removed = day.getEntries().removeIf(e -> e.getId().equals(entryId));
        if (!removed) {
            throw new ResourceNotFoundException(
                    "MealPlanEntry " + entryId + " not found on day " + dayNumber);
        }
        mealPlanRepository.save(day.getMealPlan());
    }

    // =========================================================================
    // Summary
    // =========================================================================

    @Transactional(readOnly = true)
    public MealPlanSummaryResponse getMealPlanSummary(Long mealPlanId) {
        MealPlan plan = findOrThrow(mealPlanId);

        MealPlanSummaryResponse summary = new MealPlanSummaryResponse();
        summary.setMealPlanId(plan.getId());
        summary.setName(plan.getName());
        summary.setDaysCount(plan.getDaysCount());

        // Sort profiles for deterministic order
        List<UserProfile> profiles = plan.getUserProfiles().stream()
                .sorted(Comparator.comparing(UserProfile::getId))
                .toList();

        List<MealPlanSummaryResponse.DaySummary> daySummaries = new ArrayList<>();

        for (MealPlanDay day : plan.getDays()) {
            MealPlanSummaryResponse.DaySummary daySummary = new MealPlanSummaryResponse.DaySummary();
            daySummary.setDayNumber(day.getDayNumber());

            List<MealPlanSummaryResponse.UserDaySummary> userSummaries = new ArrayList<>();

            for (UserProfile profile : profiles) {
                List<MealPlanEntry> userEntries = day.getEntries().stream()
                        .filter(e -> e.getUserProfile().getId().equals(profile.getId()))
                        .toList();

                MealPlanSummaryResponse.UserDaySummary uds = new MealPlanSummaryResponse.UserDaySummary();
                uds.setProfileId(profile.getId());
                uds.setDisplayName(profile.getDisplayName());
                uds.setTargetKcal(profile.getCalculatedKcal());
                uds.setTargetProtein(profile.getTargetProtein());
                uds.setTargetCarbs(profile.getTargetCarbs());
                uds.setTargetFat(profile.getTargetFat());
                uds.setActualKcal(userEntries.stream().mapToInt(MealPlanEntry::getCalculatedKcal).sum());
                uds.setActualProtein(userEntries.stream().mapToDouble(MealPlanEntry::getCalculatedProtein).sum());
                uds.setActualCarbs(userEntries.stream().mapToDouble(MealPlanEntry::getCalculatedCarbs).sum());
                uds.setActualFat(userEntries.stream().mapToDouble(MealPlanEntry::getCalculatedFat).sum());
                uds.setMeals(userEntries.stream()
                        .sorted(Comparator.comparing(e -> e.getMealType().ordinal()))
                        .map(MealPlanSummaryResponse.MealEntry::from)
                        .toList());

                userSummaries.add(uds);
            }

            daySummary.setPerUser(userSummaries);
            daySummaries.add(daySummary);
        }

        summary.setDays(daySummaries);
        return summary;
    }

    // =========================================================================
    // Profile-driven refresh
    // =========================================================================

    /**
     * Recomputes scaling and stored macros for every meal plan entry tied to this profile
     * (e.g. after TDEE / macro targets change on the profile).
     */
    @Transactional
    public void refreshEntriesForUserProfile(Long profileId) {
        UserProfile profile = findProfileOrThrow(profileId);
        List<MealPlanEntry> entries = mealPlanEntryRepository.findByUserProfileId(profileId);
        for (MealPlanEntry entry : entries) {
            Recipe recipe = findRecipeOrThrow(entry.getRecipe().getId());
            recipe.getIngredients().size();
            double scalingFactor = ScalingCalculator.calculateScalingFactor(
                    profile, recipe, entry.getMealsPerDay());
            MacroTotals macros = ScalingCalculator.sumScaledMacros(recipe.getIngredients(), scalingFactor);
            entry.setScalingFactor(scalingFactor);
            entry.setCalculatedKcal((int) Math.round(macros.getKcal()));
            entry.setCalculatedProtein(macros.getProtein());
            entry.setCalculatedCarbs(macros.getCarbs());
            entry.setCalculatedFat(macros.getFat());
        }
        mealPlanEntryRepository.saveAll(entries);
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    private void applyRequest(MealPlan plan, MealPlanRequest request) {
        plan.setName(request.getName());
        plan.setDaysCount(request.getDaysCount());
        plan.setStartDate(request.getStartDate());

        Set<UserProfile> profiles = request.getUserProfileIds().stream()
                .map(this::findProfileOrThrow)
                .collect(Collectors.toSet());
        plan.setUserProfiles(profiles);
    }

    /** Only non-null fields from the request are applied. */
    private void applyPartialUpdate(MealPlan plan, MealPlanUpdateRequest request) {
        if (request.getName() != null) {
            plan.setName(request.getName().trim());
        }
        if (request.getDaysCount() != null) {
            plan.setDaysCount(request.getDaysCount());
        }
        if (request.getStartDate() != null) {
            plan.setStartDate(request.getStartDate());
        }
        if (request.getUserProfileIds() != null) {
            Set<UserProfile> profiles = request.getUserProfileIds().stream()
                    .map(this::findProfileOrThrow)
                    .collect(Collectors.toSet());
            plan.setUserProfiles(profiles);
        }
    }

    /** Appends MealPlanDay entities numbered [from, to] to the plan. */
    private void addDays(MealPlan plan, int from, int to) {
        for (int n = from; n <= to; n++) {
            MealPlanDay day = new MealPlanDay();
            day.setMealPlan(plan);
            day.setDayNumber(n);
            plan.getDays().add(day);
        }
    }

    private MealPlan findOrThrow(Long id) {
        return mealPlanRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MealPlan", id));
    }

    private MealPlanDay findDayOrThrow(Long mealPlanId, int dayNumber) {
        return dayRepository.findByMealPlanIdAndDayNumber(mealPlanId, dayNumber)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "MealPlanDay not found for plan " + mealPlanId + " day " + dayNumber));
    }

    private UserProfile findProfileOrThrow(Long id) {
        return profileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("UserProfile", id));
    }

    private Recipe findRecipeOrThrow(Long id) {
        return recipeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recipe", id));
    }
}

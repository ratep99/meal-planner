package com.mealplanner.recipe;

import com.mealplanner.common.enums.MealType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RecipeRepository extends JpaRepository<Recipe, Long> {

    @Query("""
            select distinct r from Recipe r
            left join fetch r.ingredients ri
            left join fetch ri.ingredient
            where r.id = :id
            """)
    @Override
    Optional<Recipe> findById(@Param("id") Long id);

    @Query("""
            select distinct r from Recipe r
            left join fetch r.ingredients ri
            left join fetch ri.ingredient
            """)
    @Override
    List<Recipe> findAll();

    @Query("""
            select distinct r from Recipe r
            left join fetch r.ingredients ri
            left join fetch ri.ingredient
            where r.mealType = :mealType
            """)
    List<Recipe> findByMealType(@Param("mealType") MealType mealType);

    @Query("""
            select distinct r from Recipe r
            left join fetch r.ingredients ri
            left join fetch ri.ingredient
            where lower(r.name) like lower(concat('%', :name, '%'))
            """)
    List<Recipe> findByNameContainingIgnoreCase(@Param("name") String name);

    @Query("""
            select distinct r from Recipe r
            left join fetch r.ingredients ri
            left join fetch ri.ingredient
            where lower(r.name) like lower(concat('%', :name, '%')) and r.mealType = :mealType
            """)
    List<Recipe> findByNameContainingIgnoreCaseAndMealType(
            @Param("name") String name,
            @Param("mealType") MealType mealType);
}

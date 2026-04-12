package com.mealplanner.profile;

/**
 * Immutable result of a TDEE calculation.
 * Not a Spring bean — used purely as a data carrier by TDEECalculator.
 */
public final class TDEEResult {

    private final int kcal;
    private final int protein;
    private final int carbs;
    private final int fat;
    /** Maintenance TDEE (BMR × activity), before goal adjustment — exposed for the /tdee breakdown endpoint. */
    private final double rawTdee;
    /** Raw BMR before rounding, exposed for the /tdee breakdown endpoint. */
    private final double rawBmr;

    public TDEEResult(int kcal, int protein, int carbs, int fat, double rawBmr, double rawTdee) {
        this.kcal = kcal;
        this.protein = protein;
        this.carbs = carbs;
        this.fat = fat;
        this.rawBmr = rawBmr;
        this.rawTdee = rawTdee;
    }

    public int getKcal()        { return kcal; }
    public int getProtein()     { return protein; }
    public int getCarbs()       { return carbs; }
    public int getFat()         { return fat; }
    public double getRawBmr()   { return rawBmr; }
    public double getRawTdee()  { return rawTdee; }
}

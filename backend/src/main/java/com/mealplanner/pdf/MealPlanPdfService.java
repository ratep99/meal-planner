package com.mealplanner.pdf;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.AreaBreak;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.properties.AreaBreakType;
import com.itextpdf.layout.properties.TextAlignment;
import com.mealplanner.common.enums.MealType;
import com.mealplanner.common.enums.QuantityUnit;
import com.mealplanner.common.exception.ResourceNotFoundException;
import com.mealplanner.mealplan.MealPlan;
import com.mealplanner.mealplan.MealPlanDay;
import com.mealplanner.mealplan.MealPlanDayRepository;
import com.mealplanner.mealplan.MealPlanEntry;
import com.mealplanner.mealplan.MealPlanRepository;
import com.mealplanner.mealplan.ScaledIngredient;
import com.mealplanner.mealplan.ScalingCalculator;
import com.mealplanner.profile.UserProfile;
import com.mealplanner.recipe.MacroTotals;
import com.mealplanner.recipe.RecipeIngredient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MealPlanPdfService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy", Locale.ENGLISH);

    private final MealPlanRepository mealPlanRepository;
    private final MealPlanDayRepository mealPlanDayRepository;

    @Transactional(readOnly = true)
    public byte[] generateDailyPdf(long mealPlanId, int dayNumber) {
        MealPlanDay day = mealPlanDayRepository.findByMealPlanIdAndDayNumberWithDetails(mealPlanId, dayNumber)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "MealPlanDay not found for plan " + mealPlanId + " day " + dayNumber));

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(out);
        PdfDocument pdf = new PdfDocument(writer);
        Document doc = new Document(pdf, PageSize.A4);
        doc.setMargins(48, 48, 48, 48);

        renderDay(doc, day, dayNumber);
        doc.close();
        return out.toByteArray();
    }

    @Transactional(readOnly = true)
    public byte[] generateFullPlanPdf(long mealPlanId) {
        MealPlan plan = mealPlanRepository.findById(mealPlanId)
                .orElseThrow(() -> new ResourceNotFoundException("MealPlan", mealPlanId));

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(out);
        PdfDocument pdf = new PdfDocument(writer);
        Document doc = new Document(pdf, PageSize.A4);
        doc.setMargins(48, 48, 48, 48);

        for (int dayNumber = 1; dayNumber <= plan.getDaysCount(); dayNumber++) {
            if (dayNumber > 1) {
                doc.add(new AreaBreak(AreaBreakType.NEXT_PAGE));
            }
            final int d = dayNumber;
            MealPlanDay day = mealPlanDayRepository.findByMealPlanIdAndDayNumberWithDetails(mealPlanId, d)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "MealPlanDay not found for plan " + mealPlanId + " day " + d));
            renderDay(doc, day, d);
        }

        doc.close();
        return out.toByteArray();
    }

    private void renderDay(Document doc, MealPlanDay day, int dayNumber) {
        MealPlan plan = day.getMealPlan();
        plan.getUserProfiles().size();

        String dateLine = plan.getStartDate().plusDays(dayNumber - 1).format(DATE_FMT);
        String profileNames = plan.getUserProfiles().stream()
                .sorted(Comparator.comparing(UserProfile::getId))
                .map(UserProfile::getDisplayName)
                .collect(Collectors.joining(", "));

        Map<MealType, List<MealPlanEntry>> byMeal = day.getEntries().stream()
                .collect(Collectors.groupingBy(
                        MealPlanEntry::getMealType,
                        () -> new EnumMap<>(MealType.class),
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                list -> {
                                    list.sort(Comparator.comparing(e -> e.getUserProfile().getDisplayName()));
                                    return list;
                                })));

        double totalKcal = 0;
        double totalP = 0;
        double totalC = 0;
        double totalF = 0;
        for (MealPlanEntry e : day.getEntries()) {
            totalKcal += e.getCalculatedKcal();
            totalP += e.getCalculatedProtein();
            totalC += e.getCalculatedCarbs();
            totalF += e.getCalculatedFat();
        }

        doc.add(new Paragraph(plan.getName())
                .setBold()
                .setFontSize(18)
                .setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph(dateLine + "  ·  Day " + dayNumber + "  ·  " + profileNames)
                .setFontSize(11)
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(ColorConstants.DARK_GRAY));
        doc.add(new Paragraph("\n"));

        for (MealType mt : MealType.values()) {
            doc.add(new Paragraph(labelMealType(mt))
                    .setBold()
                    .setFontSize(13)
                    .setMarginTop(8));
            List<MealPlanEntry> entries = byMeal.getOrDefault(mt, List.of());
            if (entries.isEmpty()) {
                doc.add(new Paragraph("No meal planned.").setFontColor(ColorConstants.GRAY).setFontSize(10));
                continue;
            }
            for (MealPlanEntry entry : entries) {
                doc.add(new Paragraph(entry.getRecipe().getName())
                        .setBold()
                        .setFontSize(11)
                        .setMarginTop(6));
                doc.add(new Paragraph(entry.getUserProfile().getDisplayName())
                        .setFontSize(9)
                        .setItalic()
                        .setFontColor(ColorConstants.DARK_GRAY));

                for (RecipeIngredient ri : entry.getRecipe().getIngredients()) {
                    ScaledIngredient si = ScalingCalculator.scaleIngredient(ri, entry.getScalingFactor());
                    MacroTotals m = si.getMacros();
                    String qty = formatScaledQuantity(si);
                    String line = String.format(Locale.US,
                            "  • %s  %s   —  %.0f kcal, P %.1fg, C %.1fg, F %.1fg",
                            ri.getIngredient().getName(),
                            qty,
                            m.getKcal(), m.getProtein(), m.getCarbs(), m.getFat());
                    doc.add(new Paragraph(line).setFontSize(9));
                }

                doc.add(new Paragraph(String.format(Locale.US,
                        "     Recipe total: %d kcal  ·  P %.1fg  ·  C %.1fg  ·  F %.1fg",
                        entry.getCalculatedKcal(),
                        entry.getCalculatedProtein(),
                        entry.getCalculatedCarbs(),
                        entry.getCalculatedFat()))
                        .setFontSize(9)
                        .setFontColor(ColorConstants.DARK_GRAY)
                        .setMarginBottom(4));
            }
        }

        doc.add(new Paragraph("\n"));
        doc.add(new Paragraph(String.format(Locale.US,
                "Daily totals: %.0f kcal  ·  Protein %.1fg  ·  Carbs %.1fg  ·  Fat %.1fg",
                totalKcal, totalP, totalC, totalF))
                .setBold()
                .setFontSize(11)
                .setTextAlignment(TextAlignment.CENTER));
    }

    private static String labelMealType(MealType t) {
        return switch (t) {
            case BREAKFAST -> "Breakfast";
            case LUNCH -> "Lunch";
            case DINNER -> "Dinner";
            case SNACK -> "Snack";
        };
    }

    private static String formatScaledQuantity(ScaledIngredient si) {
        if (si.getUnit() == QuantityUnit.PIECES) {
            return (int) Math.round(si.getScaledQuantity()) + " kom";
        }
        double g = si.getScaledQuantity();
        if (g >= 1000) {
            return String.format(Locale.US, "%.2f kg", g / 1000.0);
        }
        return String.format(Locale.US, "%.1f g", g);
    }
}

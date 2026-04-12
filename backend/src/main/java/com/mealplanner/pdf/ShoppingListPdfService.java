package com.mealplanner.pdf;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.properties.TextAlignment;
import com.mealplanner.common.enums.IngredientCategory;
import com.mealplanner.common.exception.ResourceNotFoundException;
import com.mealplanner.shopping.ShoppingList;
import com.mealplanner.shopping.ShoppingListItem;
import com.mealplanner.shopping.ShoppingListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShoppingListPdfService {

    private final ShoppingListRepository shoppingListRepository;

    @Transactional(readOnly = true)
    public byte[] generateShoppingListPdf(long shoppingListId) {
        ShoppingList list = shoppingListRepository.findById(shoppingListId)
                .orElseThrow(() -> new ResourceNotFoundException("ShoppingList", shoppingListId));

        Map<IngredientCategory, List<ShoppingListItem>> byCategory = list.getItems().stream()
                .collect(Collectors.groupingBy(ShoppingListItem::getCategory));

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(out);
        PdfDocument pdf = new PdfDocument(writer);
        Document doc = new Document(pdf, PageSize.A4);
        doc.setMargins(48, 48, 48, 48);

        doc.add(new Paragraph(list.getName())
                .setBold()
                .setFontSize(18)
                .setTextAlignment(TextAlignment.CENTER));
        doc.add(new Paragraph(list.getDateRangeStart() + "  –  " + list.getDateRangeEnd())
                .setFontSize(10)
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(ColorConstants.DARK_GRAY));
        doc.add(new Paragraph("\n"));

        for (IngredientCategory cat : IngredientCategory.values()) {
            List<ShoppingListItem> catItems = byCategory.get(cat);
            if (catItems == null || catItems.isEmpty()) {
                continue;
            }
            catItems.sort(Comparator.comparing(i -> i.getIngredient().getName(), String.CASE_INSENSITIVE_ORDER));
            doc.add(new Paragraph(labelCategory(cat))
                    .setBold()
                    .setFontSize(12)
                    .setMarginTop(10));
            for (ShoppingListItem it : catItems) {
                String qty = formatItemQuantity(it);
                doc.add(new Paragraph(String.format(Locale.US, "  • %s   %s",
                                it.getIngredient().getName(), qty))
                        .setFontSize(10));
            }
        }

        doc.close();
        return out.toByteArray();
    }

    private static String formatItemQuantity(ShoppingListItem it) {
        String unit = it.getDisplayUnit();
        double q = it.getTotalQuantity();
        if ("kom".equals(unit)) {
            return String.format(Locale.US, "%.0f %s", q, unit);
        }
        if ("kg".equals(unit)) {
            return String.format(Locale.US, "%.2f %s", q, unit);
        }
        return String.format(Locale.US, "%.1f %s", q, unit);
    }

    private static String labelCategory(IngredientCategory c) {
        return switch (c) {
            case PRODUCE -> "Produce";
            case DAIRY -> "Dairy";
            case MEAT -> "Meat";
            case GRAIN -> "Grain";
            case PANTRY -> "Pantry";
            case OTHER -> "Other";
        };
    }
}

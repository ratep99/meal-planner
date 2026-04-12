package com.mealplanner.pdf;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pdf")
@RequiredArgsConstructor
public class PdfController {

    private final MealPlanPdfService mealPlanPdfService;
    private final ShoppingListPdfService shoppingListPdfService;

    @GetMapping("/mealplan/{mealPlanId}/day/{dayNumber}")
    public ResponseEntity<byte[]> mealPlanDayPdf(
            @PathVariable long mealPlanId,
            @PathVariable int dayNumber) {
        byte[] pdf = mealPlanPdfService.generateDailyPdf(mealPlanId, dayNumber);
        String filename = "meal-plan-" + mealPlanId + "-day-" + dayNumber + ".pdf";
        return pdfResponse(pdf, filename);
    }

    @GetMapping("/mealplan/{mealPlanId}/full")
    public ResponseEntity<byte[]> mealPlanFullPdf(@PathVariable long mealPlanId) {
        byte[] pdf = mealPlanPdfService.generateFullPlanPdf(mealPlanId);
        String filename = "meal-plan-" + mealPlanId + "-full.pdf";
        return pdfResponse(pdf, filename);
    }

    @GetMapping("/shopping/{shoppingListId}")
    public ResponseEntity<byte[]> shoppingListPdf(@PathVariable long shoppingListId) {
        byte[] pdf = shoppingListPdfService.generateShoppingListPdf(shoppingListId);
        String filename = "shopping-list-" + shoppingListId + ".pdf";
        return pdfResponse(pdf, filename);
    }

    private static ResponseEntity<byte[]> pdfResponse(byte[] pdf, String filename) {
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(filename)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}

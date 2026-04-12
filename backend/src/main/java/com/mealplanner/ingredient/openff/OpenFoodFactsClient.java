package com.mealplanner.ingredient.openff;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class OpenFoodFactsClient {

    @Qualifier("openFoodFactsWebClient")
    private final WebClient webClient;

    /**
     * Searches Open Food Facts by name query.
     * Retries transient 5xx / 429; returns an empty list if all attempts fail.
     */
    public List<OFFProduct> searchProducts(String query) {
        try {
            OFFSearchResponse response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/cgi/search.pl")
                            .queryParam("search_terms", query)
                            .queryParam("json", 1)
                            .queryParam("page_size", 10)
                            .build())
                    .retrieve()
                    .bodyToMono(OFFSearchResponse.class)
                    .retryWhen(Retry.backoff(3, Duration.ofMillis(400))
                            .maxBackoff(Duration.ofSeconds(5))
                            .filter(OpenFoodFactsClient::isRetryableOffFailure)
                            .doBeforeRetry(sig -> log.warn(
                                    "Open Food Facts unavailable ({}), retry {}/3 for query '{}'",
                                    sig.failure().getMessage(),
                                    sig.totalRetriesInARow() + 1,
                                    query)))
                    .block(Duration.ofSeconds(45));

            if (response == null || response.getProducts() == null) {
                return Collections.emptyList();
            }
            return response.getProducts();
        } catch (Exception e) {
            log.warn("Open Food Facts search failed for query '{}': {}", query, e.getMessage());
            return Collections.emptyList();
        }
    }

    private static boolean isRetryableOffFailure(Throwable t) {
        return t instanceof WebClientResponseException ex
                && (ex.getStatusCode().is5xxServerError() || ex.getStatusCode().value() == 429);
    }
}

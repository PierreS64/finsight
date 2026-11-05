package com.finsight.category;

import com.finsight.transaction.FinancialTransaction;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/categories/suggestion")
public class CategorySuggestionController {
    private final JdbcTemplate jdbc;

    public CategorySuggestionController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping
    public ResponseEntity<Suggestion> suggest(@AuthenticationPrincipal Jwt jwt,
            @RequestParam FinancialTransaction.Kind kind,
            @RequestParam(required = false) UUID merchantId,
            @RequestParam(required = false) String note) {
        UUID owner = userId(jwt);
        if (note != null && note.length() > 500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Note is too long");
        String normalized = normalize(note);
        if (merchantId == null && normalized.isBlank()) return ResponseEntity.noContent().build();

        if (merchantId != null) {
            List<Example> merchantMatches = jdbc.query(
                    "SELECT t.category_id, c.name, t.note FROM public.financial_transactions t "
                            + "JOIN public.categories c ON c.id = t.category_id "
                            + "WHERE t.owner_user_id = ? AND t.kind = ? AND t.merchant_id = ? "
                            + "ORDER BY t.occurred_on DESC, t.created_at DESC LIMIT 500",
                    (rs, row) -> new Example(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3)),
                    owner, kind.name(), merchantId);
            Suggestion found = rank(merchantMatches, "MERCHANT");
            if (found != null) return ResponseEntity.ok(found);
        }
        if (normalized.isBlank()) return ResponseEntity.noContent().build();
        List<Example> noteMatches = jdbc.query(
                "SELECT t.category_id, c.name, t.note FROM public.financial_transactions t "
                        + "JOIN public.categories c ON c.id = t.category_id "
                        + "WHERE t.owner_user_id = ? AND t.kind = ? AND t.note IS NOT NULL "
                        + "ORDER BY t.occurred_on DESC, t.created_at DESC LIMIT 500",
                (rs, row) -> new Example(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3)),
                owner, kind.name());
        Suggestion found = rank(noteMatches.stream().filter(example -> normalize(example.note()).equals(normalized)).toList(), "NOTE");
        return found == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(found);
    }

    private static Suggestion rank(List<Example> matches, String source) {
        if (matches.size() < 2) return null;
        Map<UUID, Long> counts = matches.stream().collect(Collectors.groupingBy(Example::categoryId, Collectors.counting()));
        var ranked = counts.entrySet().stream().sorted(Comparator.<Map.Entry<UUID, Long>>comparingLong(Map.Entry::getValue)
                .reversed().thenComparing(entry -> entry.getKey().toString())).toList();
        long winner = ranked.get(0).getValue();
        if (winner < 2 || (ranked.size() > 1 && ranked.get(1).getValue() >= winner)) return null;
        UUID id = ranked.get(0).getKey();
        String name = matches.stream().filter(match -> match.categoryId().equals(id)).map(Example::categoryName)
                .findFirst().orElse("");
        String confidence = winner >= 3 && winner == matches.size() ? "HIGH" : "MEDIUM";
        return new Suggestion(id, name, source, confidence, winner, matches.size());
    }

    private static String normalize(String note) {
        return note == null ? "" : note.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
    }

    private record Example(UUID categoryId, String categoryName, String note) {}
    public record Suggestion(UUID categoryId, String categoryName, String source,
                             String confidence, long supportingCount, long totalMatches) {}
}

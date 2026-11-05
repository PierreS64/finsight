package com.finsight.recurring;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/subscription-suggestions")
public class SubscriptionSuggestionController {
    private final JdbcTemplate jdbc;

    public SubscriptionSuggestionController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping
    @Transactional(readOnly = true)
    public Suggestions get(@AuthenticationPrincipal Jwt jwt) {
        UUID owner = userId(jwt);
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Bangkok"));
        List<Observation> observations = jdbc.query("SELECT t.account_id, t.category_id, t.merchant_id, m.name AS merchant_name, "
                        + "t.note, t.amount, t.occurred_on FROM public.financial_transactions t "
                        + "LEFT JOIN public.merchants m ON m.id = t.merchant_id AND m.owner_user_id = t.owner_user_id "
                        + "WHERE t.owner_user_id = ? AND t.kind = 'EXPENSE' AND t.occurred_on >= ? "
                        + "AND t.occurred_on <= ? ORDER BY t.occurred_on DESC, t.id DESC LIMIT 3000",
                (rs, row) -> new Observation((UUID) rs.getObject("account_id"), (UUID) rs.getObject("category_id"),
                        (UUID) rs.getObject("merchant_id"), rs.getString("merchant_name"), rs.getString("note"),
                        rs.getBigDecimal("amount"), rs.getObject("occurred_on", LocalDate.class)),
                owner, today.minusMonths(12), today);
        return new Suggestions(detect(observations, today), "Gợi ý từ ba khoản chi gần nhất cùng tài khoản, danh mục và nơi giao dịch/mô tả: cách nhau 25–35 ngày, số tiền lệch không quá 5%. Không tự tạo giao dịch hoặc quy tắc. Chỉ xét tối đa 3000 khoản chi trong 12 tháng gần đây.");
    }

    static List<Suggestion> detect(List<Observation> observations, LocalDate today) {
        Map<String, List<Observation>> groups = new LinkedHashMap<>();
        for (Observation row : observations) {
            String identity = row.merchantId() == null ? normalized(row.note()) : row.merchantId().toString();
            if (identity == null || row.amount().signum() <= 0) continue;
            String key = row.accountId() + "/" + row.categoryId() + "/" + identity;
            groups.computeIfAbsent(key, ignored -> new ArrayList<>()).add(row);
        }
        List<Suggestion> found = new ArrayList<>();
        for (List<Observation> group : groups.values()) {
            if (group.size() < 3) continue;
            group.sort(Comparator.comparing(Observation::occurredOn).reversed());
            Observation latest = group.get(0), previous = group.get(1), older = group.get(2);
            long firstGap = java.time.temporal.ChronoUnit.DAYS.between(older.occurredOn(), previous.occurredOn());
            long secondGap = java.time.temporal.ChronoUnit.DAYS.between(previous.occurredOn(), latest.occurredOn());
            if (firstGap < 25 || firstGap > 35 || secondGap < 25 || secondGap > 35) continue;
            BigDecimal average = older.amount().add(previous.amount()).add(latest.amount())
                    .divide(BigDecimal.valueOf(3), 2, RoundingMode.HALF_UP);
            BigDecimal tolerance = average.multiply(new BigDecimal("0.05"));
            if (List.of(older, previous, latest).stream()
                    .anyMatch(row -> row.amount().subtract(average).abs().compareTo(tolerance) > 0)) continue;
            LocalDate next = latest.occurredOn().plusMonths(1);
            if (next.isBefore(today.minusDays(14))) continue;
            String label = latest.merchantName() != null ? latest.merchantName() : latest.note().trim();
            found.add(new Suggestion(latest.accountId(), latest.categoryId(), latest.merchantId(), label,
                    average.toPlainString(), 3, latest.occurredOn(), next));
        }
        found.sort(Comparator.comparing(Suggestion::nextExpectedOn).thenComparing(Suggestion::label));
        return found;
    }

    private static String normalized(String note) {
        if (note == null || note.isBlank()) return null;
        return note.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
    }

    public record Observation(UUID accountId, UUID categoryId, UUID merchantId, String merchantName,
                              String note, BigDecimal amount, LocalDate occurredOn) {}
    public record Suggestion(UUID accountId, UUID categoryId, UUID merchantId, String label,
                             String estimatedAmount, int observedPayments, LocalDate lastPaymentOn,
                             LocalDate nextExpectedOn) {}
    public record Suggestions(List<Suggestion> items, String calculationRule) {}
}

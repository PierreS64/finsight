package com.finsight.recurring;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/upcoming-expenses")
public class UpcomingExpenseController {
    private final JdbcTemplate jdbc;

    public UpcomingExpenseController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping
    @Transactional(readOnly = true)
    public Summary list(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) LocalDate from,
                        @RequestParam(required = false) LocalDate to) {
        UUID owner;
        try { owner = UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Bangkok"));
        LocalDate start = from == null ? today.minusDays(30) : from;
        LocalDate end = to == null ? today.plusDays(30) : to;
        if (end.isBefore(start) || ChronoUnit.DAYS.between(start, end) > 366)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Date range must be 0 to 366 days");

        List<Schedule> rules = jdbc.query("SELECT id, name, account_id, category_id, amount, cadence, "
                        + "next_due_on, anchor_day, anchor_end_of_month FROM public.recurring_rules "
                        + "WHERE owner_user_id = ? AND active = TRUE AND kind = 'EXPENSE' AND next_due_on <= ?",
                (rs, row) -> new Schedule(rs.getObject("id", UUID.class), rs.getString("name"),
                        rs.getObject("account_id", UUID.class), rs.getObject("category_id", UUID.class),
                        rs.getBigDecimal("amount"), RecurringRuleController.Cadence.valueOf(rs.getString("cadence")),
                        rs.getDate("next_due_on").toLocalDate(), rs.getInt("anchor_day"),
                        rs.getBoolean("anchor_end_of_month")), owner, end);
        Set<String> processed = new HashSet<>(jdbc.query("SELECT o.rule_id, o.due_on FROM public.recurring_occurrences o "
                        + "JOIN public.recurring_rules r ON r.id = o.rule_id "
                        + "WHERE r.owner_user_id = ? AND o.due_on BETWEEN ? AND ?",
                (rs, row) -> key(rs.getObject("rule_id", UUID.class), rs.getDate("due_on").toLocalDate()),
                owner, start, end));
        List<Item> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (Schedule rule : rules) {
            LocalDate due = firstInRange(rule, start);
            while (!due.isAfter(end)) {
                if (!processed.contains(key(rule.id(), due))) {
                    items.add(new Item(rule.id(), rule.name(), rule.accountId(), rule.categoryId(),
                            rule.amount().toPlainString(), due, due.isBefore(today)));
                    total = total.add(rule.amount());
                    if (items.size() > 1000)
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Too many occurrences; narrow date range");
                }
                due = RecurringRuleController.advance(due, rule.cadence(), rule.anchorDay(), rule.endOfMonth());
            }
        }
        items.sort(Comparator.comparing(Item::dueOn).thenComparing(Item::name).thenComparing(Item::ruleId));
        return new Summary(start, end, total.toPlainString(), items.size(), items,
                "Chỉ gồm kỳ chi định kỳ đang hoạt động, chưa ghi nhận giao dịch; kỳ quá hạn vẫn nằm trong khoảng chọn.");
    }

    private static LocalDate firstInRange(Schedule rule, LocalDate start) {
        LocalDate due = rule.nextDueOn();
        if (!due.isBefore(start)) return due;
        if (rule.cadence() == RecurringRuleController.Cadence.WEEKLY) {
            long weeks = ChronoUnit.DAYS.between(due, start) / 7;
            due = due.plusWeeks(weeks);
        } else {
            long months = ChronoUnit.MONTHS.between(due.withDayOfMonth(1), start.withDayOfMonth(1));
            if (months > 0) {
                due = due.plusMonths(months);
                due = rule.endOfMonth() ? due.withDayOfMonth(due.lengthOfMonth())
                        : due.withDayOfMonth(Math.min(rule.anchorDay(), due.lengthOfMonth()));
            }
        }
        while (due.isBefore(start))
            due = RecurringRuleController.advance(due, rule.cadence(), rule.anchorDay(), rule.endOfMonth());
        return due;
    }

    private static String key(UUID id, LocalDate due) { return id + "/" + due; }
    private record Schedule(UUID id, String name, UUID accountId, UUID categoryId, BigDecimal amount,
                            RecurringRuleController.Cadence cadence, LocalDate nextDueOn,
                            int anchorDay, boolean endOfMonth) {}
    public record Item(UUID ruleId, String name, UUID accountId, UUID categoryId,
                       String amount, LocalDate dueOn, boolean overdue) {}
    public record Summary(LocalDate from, LocalDate to, String total, int count, List<Item> items,
                          String calculationRule) {}
}

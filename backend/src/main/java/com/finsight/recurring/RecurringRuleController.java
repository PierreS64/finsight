package com.finsight.recurring;

import com.finsight.account.FinancialAccount;
import com.finsight.account.FinancialAccountRepository;
import com.finsight.category.Category;
import com.finsight.category.CategoryRepository;
import com.finsight.transaction.FinancialTransaction;
import com.finsight.transaction.FinancialTransactionRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/recurring-rules")
public class RecurringRuleController {
    private final JdbcTemplate jdbc;
    private final FinancialAccountRepository accounts;
    private final CategoryRepository categories;
    private final FinancialTransactionRepository transactions;

    public RecurringRuleController(JdbcTemplate jdbc, FinancialAccountRepository accounts,
                                   CategoryRepository categories, FinancialTransactionRepository transactions) {
        this.jdbc = jdbc;
        this.accounts = accounts;
        this.categories = categories;
        this.transactions = transactions;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<Rule> list(@AuthenticationPrincipal Jwt jwt) {
        UUID owner = userId(jwt);
        return jdbc.query("SELECT id, account_id, category_id, name, kind, amount, cadence, next_due_on, "
                        + "anchor_day, anchor_end_of_month, active, note FROM public.recurring_rules "
                        + "WHERE owner_user_id = ? ORDER BY active DESC, next_due_on, name, id",
                (rs, row) -> map(rs), owner);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Rule create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody RuleRequest request) {
        UUID owner = userId(jwt);
        validateReferences(owner, request);
        UUID id = UUID.randomUUID();
        boolean endOfMonth = request.nextDueOn().equals(YearMonth.from(request.nextDueOn()).atEndOfMonth());
        jdbc.update("INSERT INTO public.recurring_rules (id, owner_user_id, account_id, category_id, name, kind, "
                        + "amount, cadence, next_due_on, anchor_day, anchor_end_of_month, active, note) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                id, owner, request.accountId(), request.categoryId(), request.name().trim(), request.kind().name(),
                request.amount(), request.cadence().name(), request.nextDueOn(), request.nextDueOn().getDayOfMonth(),
                endOfMonth, request.active(), note(request.note()));
        return find(owner, id, false);
    }

    @PutMapping("/{id}")
    @Transactional
    public Rule update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                       @Valid @RequestBody RuleRequest request) {
        UUID owner = userId(jwt);
        Rule existing = find(owner, id, true);
        validateReferences(owner, request);
        boolean sameSchedule = request.nextDueOn().equals(existing.nextDueOn()) && request.cadence() == existing.cadence();
        int anchorDay = sameSchedule ? existing.anchorDay() : request.nextDueOn().getDayOfMonth();
        boolean endOfMonth = sameSchedule ? existing.anchorEndOfMonth()
                : request.nextDueOn().equals(YearMonth.from(request.nextDueOn()).atEndOfMonth());
        jdbc.update("UPDATE public.recurring_rules SET account_id = ?, category_id = ?, name = ?, kind = ?, "
                        + "amount = ?, cadence = ?, next_due_on = ?, anchor_day = ?, anchor_end_of_month = ?, "
                        + "active = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE owner_user_id = ? AND id = ?",
                request.accountId(), request.categoryId(), request.name().trim(), request.kind().name(),
                request.amount(), request.cadence().name(), request.nextDueOn(), anchorDay,
                endOfMonth, request.active(), note(request.note()), owner, id);
        return find(owner, id, false);
    }

    @PostMapping("/{id}/process")
    @Transactional
    public ProcessResult process(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        UUID owner = userId(jwt);
        Rule rule = find(owner, id, true);
        if (!rule.active()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Paused rule cannot be processed");
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Bangkok"));
        LocalDate due = rule.nextDueOn();
        int created = 0;
        int examined = 0;
        while (!due.isAfter(today)) {
            if (++examined > 52)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Too many due periods; edit next due date first");
            Integer existing = jdbc.queryForObject("SELECT COUNT(*) FROM public.recurring_occurrences WHERE rule_id = ? AND due_on = ?",
                    Integer.class, id, due);
            if (existing == null || existing == 0) {
                FinancialTransaction transaction = transactions.saveAndFlush(new FinancialTransaction(owner,
                        rule.accountId(), rule.categoryId(), rule.kind(), new BigDecimal(rule.amount()), due, rule.note()));
                jdbc.update("INSERT INTO public.recurring_occurrences (rule_id, due_on, transaction_id) VALUES (?, ?, ?)",
                        id, due, transaction.getId());
                created++;
            }
            due = advance(due, rule.cadence(), rule.anchorDay(), rule.anchorEndOfMonth());
        }
        jdbc.update("UPDATE public.recurring_rules SET next_due_on = ?, updated_at = CURRENT_TIMESTAMP "
                + "WHERE owner_user_id = ? AND id = ?", due, owner, id);
        return new ProcessResult(created, due, "Chỉ ghi nhận kỳ đến hạn khi người dùng bấm xử lý; mỗi (quy tắc, ngày đến hạn) được ghi một lần.");
    }

    static LocalDate advance(LocalDate due, Cadence cadence, int anchorDay, boolean endOfMonth) {
        if (cadence == Cadence.WEEKLY) return due.plusWeeks(1);
        YearMonth next = YearMonth.from(due).plusMonths(1);
        return next.atDay(endOfMonth ? next.lengthOfMonth() : Math.min(anchorDay, next.lengthOfMonth()));
    }

    private Rule find(UUID owner, UUID id, boolean lock) {
        try {
            return jdbc.queryForObject("SELECT id, account_id, category_id, name, kind, amount, cadence, next_due_on, "
                            + "anchor_day, anchor_end_of_month, active, note FROM public.recurring_rules "
                            + "WHERE owner_user_id = ? AND id = ?" + (lock ? " FOR UPDATE" : ""),
                    (rs, row) -> map(rs), owner, id);
        } catch (EmptyResultDataAccessException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Recurring rule not found");
        }
    }

    private static Rule map(ResultSet rs) throws SQLException {
        return new Rule(rs.getObject("id", UUID.class), rs.getObject("account_id", UUID.class),
                rs.getObject("category_id", UUID.class), rs.getString("name"),
                FinancialTransaction.Kind.valueOf(rs.getString("kind")), rs.getBigDecimal("amount").toPlainString(),
                Cadence.valueOf(rs.getString("cadence")), rs.getDate("next_due_on").toLocalDate(),
                rs.getInt("anchor_day"), rs.getBoolean("anchor_end_of_month"), rs.getBoolean("active"),
                rs.getString("note"));
    }

    private void validateReferences(UUID owner, RuleRequest request) {
        FinancialAccount account = accounts.findById(request.accountId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
        if (!owner.equals(account.getOwnerUserId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found");
        Category category = categories.findById(request.categoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
        if (category.getOwnerUserId() != null && !owner.equals(category.getOwnerUserId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found");
        if (!category.getCategoryType().name().equals(request.kind().name()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category type must match recurring kind");
    }

    private static String note(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private static UUID userId(Jwt jwt) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
    }

    public enum Cadence { WEEKLY, MONTHLY }
    public record RuleRequest(@NotNull UUID accountId, @NotNull UUID categoryId,
                              @NotBlank @Size(max = 100) String name, @NotNull FinancialTransaction.Kind kind,
                              @NotNull @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal amount,
                              @NotNull Cadence cadence, @NotNull LocalDate nextDueOn,
                              @NotNull Boolean active, @Size(max = 500) String note) {}
    public record Rule(UUID id, UUID accountId, UUID categoryId, String name,
                       FinancialTransaction.Kind kind, String amount, Cadence cadence, LocalDate nextDueOn,
                       int anchorDay, boolean anchorEndOfMonth, boolean active, String note) {}
    public record ProcessResult(int createdTransactions, LocalDate nextDueOn, String rule) {}
}

package com.finsight.goal;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/v1/goals")
public class FinancialGoalController {
    private final FinancialGoalStore store;

    public FinancialGoalController(FinancialGoalStore store) { this.store = store; }

    @GetMapping
    @Transactional(readOnly = true)
    public List<GoalResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return store.list(userId(jwt)).stream().map(FinancialGoalController::response).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public GoalResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody GoalRequest request) {
        return response(store.create(userId(jwt), request.name().trim(), request.targetAmount(),
                request.savedAmount(), request.targetDate(), clean(request.note())));
    }

    @PutMapping("/{id}")
    @Transactional
    public GoalResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                               @Valid @RequestBody GoalRequest request) {
        return response(store.update(userId(jwt), id, request.name().trim(), request.targetAmount(),
                        request.savedAmount(), request.targetDate(), clean(request.note()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Goal not found")));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        if (!store.delete(userId(jwt), id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Goal not found");
    }

    private static GoalResponse response(FinancialGoalStore.Goal goal) {
        BigDecimal remaining = goal.targetAmount().subtract(goal.savedAmount()).max(BigDecimal.ZERO.setScale(2));
        BigDecimal progress = goal.savedAmount().multiply(BigDecimal.valueOf(100))
                .divide(goal.targetAmount(), 1, RoundingMode.HALF_UP).min(BigDecimal.valueOf(100));
        boolean achieved = remaining.signum() == 0;
        boolean overdue = !achieved && goal.targetDate() != null
                && goal.targetDate().isBefore(LocalDate.now(ZoneId.of("Asia/Bangkok")));
        return new GoalResponse(goal.id(), goal.name(), goal.targetAmount().toPlainString(),
                goal.savedAmount().toPlainString(), remaining.toPlainString(), progress.toPlainString(),
                goal.targetDate(), goal.note(), achieved, overdue, goal.createdAt(), goal.updatedAt());
    }

    private static String clean(String note) { return note == null || note.isBlank() ? null : note.trim(); }

    private static UUID userId(Jwt jwt) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
    }

    public record GoalRequest(@NotBlank @Size(max = 100) String name,
                              @NotNull @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal targetAmount,
                              @NotNull @DecimalMin("0.00") @Digits(integer = 17, fraction = 2) BigDecimal savedAmount,
                              LocalDate targetDate, @Size(max = 500) String note) {}

    public record GoalResponse(UUID id, String name, String targetAmount, String savedAmount,
                               String remainingAmount, String progressPercent, LocalDate targetDate,
                               String note, boolean achieved, boolean overdue, Instant createdAt, Instant updatedAt) {}
}

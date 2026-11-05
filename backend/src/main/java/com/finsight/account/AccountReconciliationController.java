package com.finsight.account;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import com.finsight.transaction.FinancialTransactionRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/accounts/{accountId}/reconciliations")
public class AccountReconciliationController {
    private final FinancialAccountRepository accounts;
    private final FinancialTransactionRepository transactions;
    private final AccountReconciliationStore store;

    public AccountReconciliationController(FinancialAccountRepository accounts,
                                           FinancialTransactionRepository transactions,
                                           AccountReconciliationStore store) {
        this.accounts = accounts;
        this.transactions = transactions;
        this.store = store;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ReconciliationResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID accountId) {
        UUID owner = owner(jwt);
        owned(owner, accountId);
        return store.list(owner, accountId).stream().map(AccountReconciliationController::response).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ReconciliationResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID accountId,
                                         @Valid @RequestBody ReconciliationRequest request) {
        UUID owner = owner(jwt);
        FinancialAccount account = owned(owner, accountId);
        BigDecimal expected = account.getOpeningBalance().add(transactions.netForAccount(owner, accountId));
        return response(store.create(owner, accountId, expected, request.observedBalance(), clean(request.note())));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID accountId, @PathVariable UUID id) {
        UUID owner = owner(jwt);
        owned(owner, accountId);
        if (!store.delete(owner, accountId, id))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Reconciliation not found");
    }

    private FinancialAccount owned(UUID owner, UUID id) {
        FinancialAccount account = accounts.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
        if (!owner.equals(account.getOwnerUserId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found");
        return account;
    }

    private static ReconciliationResponse response(AccountReconciliationStore.Reconciliation value) {
        String status = value.differenceAmount().signum() == 0 ? "BALANCED"
                : value.differenceAmount().signum() > 0 ? "SURPLUS" : "SHORTFALL";
        return new ReconciliationResponse(value.id(), value.accountId(), value.expectedBalance().toPlainString(),
                value.observedBalance().toPlainString(), value.differenceAmount().toPlainString(),
                status, value.note(), value.recordedAt());
    }

    private static String clean(String note) { return note == null || note.isBlank() ? null : note.trim(); }

    private static UUID owner(Jwt jwt) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
    }

    public record ReconciliationRequest(@NotNull @Digits(integer = 17, fraction = 2) BigDecimal observedBalance,
                                        @Size(max = 500) String note) {}
    public record ReconciliationResponse(UUID id, UUID accountId, String expectedBalance, String observedBalance,
                                         String differenceAmount, String status, String note, Instant recordedAt) {}
}

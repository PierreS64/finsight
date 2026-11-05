package com.finsight.account;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import com.finsight.transaction.FinancialTransactionRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/accounts")
public class FinancialAccountController {
    private final FinancialAccountRepository accounts;
    private final FinancialTransactionRepository transactions;

    public FinancialAccountController(FinancialAccountRepository accounts, FinancialTransactionRepository transactions) {
        this.accounts = accounts;
        this.transactions = transactions;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<AccountResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return accounts.findAllByOwnerUserIdOrderByCreatedAtAsc(userId(jwt)).stream()
                .map(account -> response(account)).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public AccountResponse create(@AuthenticationPrincipal Jwt jwt,
                                  @Valid @RequestBody CreateAccountRequest request) {
        FinancialAccount account = new FinancialAccount(userId(jwt), request.name().trim(),
                request.accountType(), request.openingBalance());
        return response(accounts.save(account));
    }

    private AccountResponse response(FinancialAccount account) {
        BigDecimal current = account.getOpeningBalance().add(
                transactions.netForAccount(account.getOwnerUserId(), account.getId()));
        return new AccountResponse(account.getId(), account.getName(), account.getAccountType(),
                account.getOpeningBalance().toPlainString(), current.toPlainString(),
                account.getCurrencyCode(), account.getCreatedAt());
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
    }

    public record CreateAccountRequest(@NotBlank @Size(max = 80) String name,
                                       @NotNull FinancialAccount.Type accountType,
                                       @NotNull @Digits(integer = 17, fraction = 2) BigDecimal openingBalance) {}

    public record AccountResponse(UUID id, String name, FinancialAccount.Type accountType,
                                  String openingBalance, String currentBalance, String currencyCode, Instant createdAt) {}
}

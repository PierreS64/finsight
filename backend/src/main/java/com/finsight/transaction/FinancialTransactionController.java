package com.finsight.transaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import com.finsight.account.FinancialAccount;
import com.finsight.account.FinancialAccountRepository;
import com.finsight.category.Category;
import com.finsight.category.CategoryRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/transactions")
public class FinancialTransactionController {
    private final FinancialTransactionRepository transactions;
    private final FinancialAccountRepository accounts;
    private final CategoryRepository categories;

    public FinancialTransactionController(FinancialTransactionRepository transactions,
                                          FinancialAccountRepository accounts, CategoryRepository categories) {
        this.transactions = transactions;
        this.accounts = accounts;
        this.categories = categories;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<TransactionResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return transactions.findAllByOwnerUserIdOrderByOccurredOnDescCreatedAtDescIdDesc(userId(jwt))
                .stream().map(TransactionResponse::from).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public TransactionResponse detail(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return TransactionResponse.from(owned(id, userId(jwt)));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public TransactionResponse create(@AuthenticationPrincipal Jwt jwt,
                                      @Valid @RequestBody TransactionRequest request) {
        UUID owner = userId(jwt);
        validateReferences(owner, request);
        FinancialTransaction transaction = new FinancialTransaction(owner, request.accountId(), request.categoryId(),
                request.kind(), request.amount(), request.occurredOn(), request.note());
        return TransactionResponse.from(transactions.save(transaction));
    }

    @PutMapping("/{id}")
    @Transactional
    public TransactionResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                      @Valid @RequestBody TransactionRequest request) {
        UUID owner = userId(jwt);
        FinancialTransaction transaction = owned(id, owner);
        validateReferences(owner, request);
        transaction.update(request.accountId(), request.categoryId(), request.kind(), request.amount(),
                request.occurredOn(), request.note());
        return TransactionResponse.from(transactions.save(transaction));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        transactions.delete(owned(id, userId(jwt)));
    }

    private FinancialTransaction owned(UUID id, UUID owner) {
        FinancialTransaction transaction = transactions.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
        if (!owner.equals(transaction.getOwnerUserId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found");
        return transaction;
    }

    private void validateReferences(UUID owner, TransactionRequest request) {
        FinancialAccount account = accounts.findById(request.accountId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
        if (!owner.equals(account.getOwnerUserId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found");
        Category category = categories.findById(request.categoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
        if (category.getOwnerUserId() != null && !owner.equals(category.getOwnerUserId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found");
        if (!category.getCategoryType().name().equals(request.kind().name()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category type must match transaction kind");
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
    }

    public record TransactionRequest(@NotNull UUID accountId, @NotNull UUID categoryId,
                                     @NotNull FinancialTransaction.Kind kind,
                                     @NotNull @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal amount,
                                     @NotNull LocalDate occurredOn, @Size(max = 500) String note) {}

    public record TransactionResponse(UUID id, UUID accountId, UUID categoryId, FinancialTransaction.Kind kind,
                                      String amount, LocalDate occurredOn, String note, Instant createdAt) {
        static TransactionResponse from(FinancialTransaction transaction) {
            return new TransactionResponse(transaction.getId(), transaction.getAccountId(), transaction.getCategoryId(),
                    transaction.getKind(), transaction.getAmount().toPlainString(), transaction.getOccurredOn(),
                    transaction.getNote(), transaction.getCreatedAt());
        }
    }
}

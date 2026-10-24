package com.finsight.transfer;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import com.finsight.account.FinancialAccount;
import com.finsight.account.FinancialAccountRepository;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/transfers")
public class AccountTransferController {
    private final AccountTransferRepository transfers;
    private final FinancialAccountRepository accounts;

    public AccountTransferController(AccountTransferRepository transfers, FinancialAccountRepository accounts) {
        this.transfers = transfers;
        this.accounts = accounts;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<TransferResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return transfers.findAllByOwnerUserIdOrderByOccurredOnDescCreatedAtDescIdDesc(userId(jwt))
                .stream().map(TransferResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public TransferResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody TransferRequest request) {
        UUID owner = userId(jwt);
        if (request.fromAccountId().equals(request.toAccountId()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Source and destination must differ");
        requireOwnedAccount(request.fromAccountId(), owner);
        requireOwnedAccount(request.toAccountId(), owner);
        AccountTransfer transfer = new AccountTransfer(owner, request.fromAccountId(), request.toAccountId(),
                request.amount(), request.occurredOn(), request.note());
        return TransferResponse.from(transfers.save(transfer));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        UUID owner = userId(jwt);
        AccountTransfer transfer = transfers.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transfer not found"));
        if (!owner.equals(transfer.getOwnerUserId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Transfer not found");
        transfers.delete(transfer);
    }

    private void requireOwnedAccount(UUID id, UUID owner) {
        FinancialAccount account = accounts.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
        if (!owner.equals(account.getOwnerUserId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found");
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
    }

    public record TransferRequest(@NotNull UUID fromAccountId, @NotNull UUID toAccountId,
                                  @NotNull @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal amount,
                                  @NotNull LocalDate occurredOn, @Size(max = 500) String note) {}

    public record TransferResponse(UUID id, UUID fromAccountId, UUID toAccountId,
                                   String amount, LocalDate occurredOn, String note, Instant createdAt) {
        static TransferResponse from(AccountTransfer transfer) {
            return new TransferResponse(transfer.getId(), transfer.getFromAccountId(), transfer.getToAccountId(),
                    transfer.getAmount().toPlainString(), transfer.getOccurredOn(), transfer.getNote(),
                    transfer.getCreatedAt());
        }
    }
}

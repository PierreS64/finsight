package com.finsight.transaction;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import com.finsight.account.FinancialAccount;
import com.finsight.account.FinancialAccountRepository;
import com.finsight.category.Category;
import com.finsight.category.CategoryRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/statements")
public class StatementImportController {
    private final FinancialAccountRepository accounts;
    private final CategoryRepository categories;
    private final FinancialTransactionRepository transactions;
    private final JdbcTemplate jdbc;

    public StatementImportController(FinancialAccountRepository accounts, CategoryRepository categories,
                                     FinancialTransactionRepository transactions, JdbcTemplate jdbc) {
        this.accounts = accounts;
        this.categories = categories;
        this.transactions = transactions;
        this.jdbc = jdbc;
    }

    @PostMapping(value = "/preview", consumes = "multipart/form-data")
    @Transactional(readOnly = true)
    public PreviewResponse preview(@AuthenticationPrincipal Jwt jwt, @RequestParam UUID accountId,
                                   @RequestPart("file") MultipartFile file) throws IOException {
        UUID owner = owner(jwt);
        account(owner, accountId);
        if (file.isEmpty() || file.getSize() > 2_000_000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Statement must be at most 2 MB");
        StatementParser.Preview parsed = StatementParser.parse(file.getOriginalFilename(), file.getBytes());
        Set<String> seen = new HashSet<>();
        List<PreviewRow> rows = new ArrayList<>();
        for (StatementParser.ParsedRow row : parsed.rows()) {
            String identity = row.occurredOn() + "|" + row.kind() + "|"
                    + row.amount().stripTrailingZeros().toPlainString() + "|" + row.description();
            boolean inFileDuplicate = !seen.add(identity);
            rows.add(new PreviewRow(row.rowNumber(), row.occurredOn(), row.description(),
                    row.amount().toPlainString(), row.kind(), imported(owner, parsed.sourceHash(), row.rowNumber()),
                    inFileDuplicate || possibleDuplicate(owner, accountId, row.occurredOn(), row.kind(), row.amount(), row.description())));
        }
        return new PreviewResponse(parsed.sourceHash(), rows);
    }

    @PostMapping("/import")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ImportResponse importRows(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ImportRequest request) {
        UUID owner = owner(jwt);
        account(owner, request.accountId());
        if (request.sourceHash() == null || !request.sourceHash().matches("[0-9a-f]{64}")
                || request.rows() == null || request.rows().isEmpty() || request.rows().size() > 200)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid import batch");
        Set<Integer> seen = new HashSet<>();
        List<UUID> ids = new ArrayList<>();
        for (ImportRow row : request.rows()) {
            validateRow(owner, row);
            if (!seen.add(row.rowNumber()))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duplicate row number in request");
            if (imported(owner, request.sourceHash(), row.rowNumber()))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Statement row was already imported");
            if (!row.allowPossibleDuplicate() && possibleDuplicate(owner, request.accountId(), row.occurredOn(),
                    row.kind(), row.amount(), row.description()))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Possible duplicate transaction; review and confirm");
            FinancialTransaction transaction = transactions.saveAndFlush(new FinancialTransaction(owner,
                    request.accountId(), row.categoryId(), row.kind(), row.amount(), row.occurredOn(), row.description()));
            try {
                jdbc.update("INSERT INTO public.statement_import_rows "
                        + "(id, owner_user_id, transaction_id, source_hash, row_number) VALUES (?, ?, ?, ?, ?)",
                        UUID.randomUUID(), owner, transaction.getId(), request.sourceHash(), row.rowNumber());
            } catch (DataIntegrityViolationException ex) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Statement row was already imported", ex);
            }
            ids.add(transaction.getId());
        }
        return new ImportResponse(ids.size(), ids);
    }

    private void validateRow(UUID owner, ImportRow row) {
        if (row == null || row.rowNumber() < 2 || row.categoryId() == null || row.kind() == null
                || row.occurredOn() == null || row.description() == null || row.description().isBlank()
                || row.description().length() > 500 || row.amount() == null || row.amount().signum() <= 0
                || row.amount().scale() > 2 || row.amount().precision() - row.amount().scale() > 17)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid statement row");
        Category category = categories.findById(row.categoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
        if (category.getOwnerUserId() != null && !owner.equals(category.getOwnerUserId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found");
        if (!category.getCategoryType().name().equals(row.kind().name()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category type must match statement row");
    }

    private FinancialAccount account(UUID owner, UUID id) {
        FinancialAccount found = accounts.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
        if (!owner.equals(found.getOwnerUserId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found");
        return found;
    }

    private boolean imported(UUID owner, String hash, int row) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM public.statement_import_rows "
                + "WHERE owner_user_id = ? AND source_hash = ? AND row_number = ?", Integer.class, owner, hash, row);
        return count != null && count > 0;
    }

    private boolean possibleDuplicate(UUID owner, UUID account, LocalDate date, FinancialTransaction.Kind kind,
                                      BigDecimal amount, String description) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM public.financial_transactions "
                + "WHERE owner_user_id = ? AND account_id = ? AND occurred_on = ? AND kind = ? "
                + "AND amount = ? AND note = ?", Integer.class, owner, account, date, kind.name(), amount, description);
        return count != null && count > 0;
    }

    private static UUID owner(Jwt jwt) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail importError(ResponseStatusException ex) {
        return ProblemDetail.forStatusAndDetail(ex.getStatusCode(),
                ex.getReason() == null ? "Statement request failed" : ex.getReason());
    }

    public record PreviewRow(int rowNumber, LocalDate occurredOn, String description, String amount,
                             FinancialTransaction.Kind kind, boolean alreadyImported, boolean possibleDuplicate) {}
    public record PreviewResponse(String sourceHash, List<PreviewRow> rows) {}
    public record ImportRow(int rowNumber, @NotNull UUID categoryId, @NotNull FinancialTransaction.Kind kind,
                            @NotNull BigDecimal amount, @NotNull LocalDate occurredOn, String description,
                            boolean allowPossibleDuplicate) {}
    public record ImportRequest(@NotNull UUID accountId, String sourceHash, List<ImportRow> rows) {}
    public record ImportResponse(int importedCount, List<UUID> transactionIds) {}
}

package com.finsight.transaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
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
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.RequestPart;
import java.io.IOException;

@RestController
@RequestMapping("/api/v1/transactions")
public class FinancialTransactionController {
    private final FinancialTransactionRepository transactions;
    private final FinancialAccountRepository accounts;
    private final CategoryRepository categories;
    private final TransactionReceiptStore receipts;
    private final JdbcTemplate merchantJdbc;

    public FinancialTransactionController(FinancialTransactionRepository transactions,
                                          FinancialAccountRepository accounts, CategoryRepository categories,
                                          TransactionReceiptStore receipts, JdbcTemplate merchantJdbc) {
        this.transactions = transactions;
        this.accounts = accounts;
        this.categories = categories;
        this.receipts = receipts;
        this.merchantJdbc = merchantJdbc;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<TransactionResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return transactions.findAllByOwnerUserIdOrderByOccurredOnDescCreatedAtDescIdDesc(userId(jwt))
                .stream().map(this::response).toList();
    }

    @GetMapping("/history")
    @Transactional(readOnly = true)
    public HistoryResponse history(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) FinancialTransaction.Kind kind,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(defaultValue = "desc") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        if (page < 0 || size < 1 || size > 50 || (search != null && search.length() > 100))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid history page or search");
        if (from != null && to != null && from.isAfter(to))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start date must precede end date");
        YearMonth parsedMonth = null;
        if (month != null && !month.isBlank()) {
            try { parsedMonth = YearMonth.parse(month); }
            catch (DateTimeParseException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Month must have format YYYY-MM");
            }
        }
        Sort.Direction direction;
        if ("asc".equalsIgnoreCase(sort)) direction = Sort.Direction.ASC;
        else if ("desc".equalsIgnoreCase(sort)) direction = Sort.Direction.DESC;
        else throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sort must be asc or desc");
        UUID owner = userId(jwt);
        YearMonth finalMonth = parsedMonth;
        String term = search == null || search.isBlank() ? null : "%" + escapeLike(search.trim().toLowerCase(Locale.ROOT)) + "%";
        Specification<FinancialTransaction> filters = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("ownerUserId"), owner));
            if (from != null) predicates.add(cb.greaterThanOrEqualTo(root.get("occurredOn"), from));
            if (to != null) predicates.add(cb.lessThanOrEqualTo(root.get("occurredOn"), to));
            if (finalMonth != null) predicates.add(cb.between(root.get("occurredOn"), finalMonth.atDay(1), finalMonth.atEndOfMonth()));
            if (kind != null) predicates.add(cb.equal(root.get("kind"), kind));
            if (categoryId != null) predicates.add(cb.equal(root.get("categoryId"), categoryId));
            if (term != null) {
                Subquery<UUID> category = query.subquery(UUID.class);
                var categoryRoot = category.from(Category.class);
                category.select(categoryRoot.get("id")).where(cb.equal(categoryRoot.get("id"), root.get("categoryId")),
                        cb.like(cb.lower(categoryRoot.get("name")), term, '\\'));
                Subquery<UUID> merchant = query.subquery(UUID.class);
                var merchantRoot = merchant.from(com.finsight.merchant.Merchant.class);
                merchant.select(merchantRoot.get("id")).where(cb.equal(merchantRoot.get("id"), root.get("merchantId")),
                        cb.equal(merchantRoot.get("ownerUserId"), owner), cb.like(cb.lower(merchantRoot.get("name")), term, '\\'));
                Subquery<UUID> account = query.subquery(UUID.class);
                var accountRoot = account.from(FinancialAccount.class);
                account.select(accountRoot.get("id")).where(cb.equal(accountRoot.get("id"), root.get("accountId")),
                        cb.like(cb.lower(accountRoot.get("name")), term, '\\'));
                predicates.add(cb.or(cb.like(cb.lower(root.get("note")), term, '\\'),
                        cb.exists(category), cb.exists(account), cb.exists(merchant)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        Page<FinancialTransaction> result = transactions.findAll(filters,
                PageRequest.of(page, size, Sort.by(direction, "occurredOn", "createdAt", "id")));
        return new HistoryResponse(result.getContent().stream().map(this::response).toList(), page, size,
                result.getTotalElements(), result.getTotalPages());
    }

    private static String escapeLike(String term) {
        return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public TransactionResponse detail(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return response(owned(id, userId(jwt)));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public TransactionResponse create(@AuthenticationPrincipal Jwt jwt,
                                      @Valid @RequestBody TransactionRequest request) {
        UUID owner = userId(jwt);
        validateReferences(owner, request);
        FinancialTransaction transaction = new FinancialTransaction(owner, request.accountId(), request.categoryId(),
                request.merchantId(), request.kind(), request.amount(), request.occurredOn(), request.note());
        return response(transactions.save(transaction));
    }

    @PutMapping("/{id}")
    @Transactional
    public TransactionResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                      @Valid @RequestBody TransactionRequest request) {
        UUID owner = userId(jwt);
        FinancialTransaction transaction = owned(id, owner);
        validateReferences(owner, request);
        transaction.update(request.accountId(), request.categoryId(), request.merchantId(), request.kind(), request.amount(),
                request.occurredOn(), request.note());
        return response(transactions.save(transaction));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        transactions.delete(owned(id, userId(jwt)));
    }

    @PostMapping(value = "/{id}/receipt", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void uploadReceipt(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                              @RequestPart("file") MultipartFile file) throws IOException {
        owned(id, userId(jwt));
        if (file.isEmpty() || file.getSize() > 5_000_000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Receipt must be at most 5 MB");
        byte[] bytes = file.getBytes();
        String type = file.getContentType();
        if (!validImage(type, bytes))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Receipt must be a JPEG, PNG or WebP image");
        receipts.replace(id, type, bytes);
    }

    @GetMapping("/{id}/receipt")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> getReceipt(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        owned(id, userId(jwt));
        TransactionReceiptStore.Receipt receipt = receipts.find(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Receipt not found"));
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(receipt.contentType()))
                .header("Cache-Control", "private, no-store")
                .header("X-Content-Type-Options", "nosniff")
                .body(receipt.bytes());
    }

    @DeleteMapping("/{id}/receipt")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteReceipt(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        owned(id, userId(jwt));
        receipts.delete(id);
    }

    static boolean validImage(String type, byte[] bytes) {
        if ("image/jpeg".equals(type))
            return bytes.length >= 3 && (bytes[0] & 255) == 255 && (bytes[1] & 255) == 216 && (bytes[2] & 255) == 255;
        if ("image/png".equals(type))
            return bytes.length >= 8 && Arrays.equals(Arrays.copyOf(bytes, 8),
                    new byte[] {(byte) 137, 80, 78, 71, 13, 10, 26, 10});
        if ("image/webp".equals(type))
            return bytes.length >= 12 && "RIFF".equals(new String(bytes, 0, 4, java.nio.charset.StandardCharsets.US_ASCII))
                    && "WEBP".equals(new String(bytes, 8, 4, java.nio.charset.StandardCharsets.US_ASCII));
        return false;
    }

    private TransactionResponse response(FinancialTransaction transaction) {
        return TransactionResponse.from(transaction, receipts.exists(transaction.getId()));
    }

    private FinancialTransaction owned(UUID id, UUID owner) {
        FinancialTransaction transaction = transactions.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
        if (!owner.equals(transaction.getOwnerUserId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found");
        return transaction;
    }

    private void validateReferences(UUID owner, TransactionRequest request) {
        if (request.merchantId() != null) {
            Integer matches = merchantJdbc.queryForObject("SELECT COUNT(*) FROM public.merchants "
                    + "WHERE owner_user_id = ? AND id = ?", Integer.class, owner, request.merchantId());
            if (matches == null || matches == 0)
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Merchant not found");
        }
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

    public record TransactionRequest(@NotNull UUID accountId, @NotNull UUID categoryId, UUID merchantId,
                                     @NotNull FinancialTransaction.Kind kind,
                                     @NotNull @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal amount,
                                     @NotNull LocalDate occurredOn, @Size(max = 500) String note) {}

    public record TransactionResponse(UUID id, UUID accountId, UUID categoryId, UUID merchantId, FinancialTransaction.Kind kind,
                                      String amount, LocalDate occurredOn, String note, Instant createdAt,
                                      boolean hasReceipt) {
        static TransactionResponse from(FinancialTransaction transaction, boolean hasReceipt) {
            return new TransactionResponse(transaction.getId(), transaction.getAccountId(), transaction.getCategoryId(), transaction.getMerchantId(),
                    transaction.getKind(), transaction.getAmount().toPlainString(), transaction.getOccurredOn(),
                    transaction.getNote(), transaction.getCreatedAt(), hasReceipt);
        }
    }

    public record HistoryResponse(List<TransactionResponse> items, int page, int size,
                                  long totalElements, int totalPages) {}
}

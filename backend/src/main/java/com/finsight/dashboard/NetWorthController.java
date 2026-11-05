package com.finsight.dashboard;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import com.finsight.account.FinancialAccountRepository;
import com.finsight.transaction.FinancialTransactionRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/net-worth")
public class NetWorthController {
    private final JdbcTemplate jdbc;
    private final FinancialAccountRepository accounts;
    private final FinancialTransactionRepository transactions;

    public NetWorthController(JdbcTemplate jdbc, FinancialAccountRepository accounts,
                              FinancialTransactionRepository transactions) {
        this.jdbc = jdbc;
        this.accounts = accounts;
        this.transactions = transactions;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public NetWorthResponse get(@AuthenticationPrincipal Jwt jwt) {
        UUID owner = userId(jwt);
        List<AccountLine> accountLines = new ArrayList<>();
        BigDecimal accountAssets = BigDecimal.ZERO;
        BigDecimal accountLiabilities = BigDecimal.ZERO;
        for (var account : accounts.findAllByOwnerUserIdOrderByCreatedAtAsc(owner)) {
            BigDecimal balance = account.getOpeningBalance().add(transactions.netForAccount(owner, account.getId()));
            accountLines.add(new AccountLine(account.getId(), account.getName(), balance.toPlainString()));
            if (balance.signum() >= 0) accountAssets = accountAssets.add(balance);
            else accountLiabilities = accountLiabilities.add(balance.negate());
        }
        List<ItemLine> items = list(owner);
        BigDecimal assets = accountAssets;
        BigDecimal liabilities = accountLiabilities;
        for (ItemLine item : items) {
            if (item.kind() == Kind.ASSET) assets = assets.add(new BigDecimal(item.amount()));
            else liabilities = liabilities.add(new BigDecimal(item.amount()));
        }
        return new NetWorthResponse(accountAssets.toPlainString(), accountLiabilities.toPlainString(),
                assets.toPlainString(), liabilities.toPlainString(), assets.subtract(liabilities).toPlainString(),
                accountLines, items, "Current account balances plus manually entered assets, minus manually entered liabilities. Negative account balances count as liabilities; goals are excluded.");
    }

    @PostMapping("/items")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ItemLine create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ItemRequest request) {
        UUID owner = userId(jwt);
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO public.balance_sheet_items (id, owner_user_id, name, kind, amount, note) VALUES (?, ?, ?, ?, ?, ?)",
                id, owner, request.name().trim(), request.kind().name(), request.amount(), clean(request.note()));
        return find(owner, id);
    }

    @PutMapping("/items/{id}")
    @Transactional
    public ItemLine update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                           @Valid @RequestBody ItemRequest request) {
        UUID owner = userId(jwt);
        int changed = jdbc.update("UPDATE public.balance_sheet_items SET name = ?, kind = ?, amount = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE owner_user_id = ? AND id = ?",
                request.name().trim(), request.kind().name(), request.amount(), clean(request.note()), owner, id);
        if (changed == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found");
        return find(owner, id);
    }

    @DeleteMapping("/items/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        if (jdbc.update("DELETE FROM public.balance_sheet_items WHERE owner_user_id = ? AND id = ?", userId(jwt), id) == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found");
    }

    private List<ItemLine> list(UUID owner) {
        return jdbc.query("SELECT id, name, kind, amount, note, created_at, updated_at FROM public.balance_sheet_items WHERE owner_user_id = ? ORDER BY created_at DESC, id DESC",
                (rs, row) -> new ItemLine((UUID) rs.getObject("id"), rs.getString("name"),
                        Kind.valueOf(rs.getString("kind")), rs.getBigDecimal("amount").toPlainString(),
                        rs.getString("note"), rs.getTimestamp("created_at").toInstant(),
                        rs.getTimestamp("updated_at").toInstant()), owner);
    }

    private ItemLine find(UUID owner, UUID id) {
        return list(owner).stream().filter(item -> item.id().equals(id)).findFirst().orElseThrow();
    }

    private static String clean(String note) { return note == null || note.isBlank() ? null : note.trim(); }
    private static UUID userId(Jwt jwt) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
    }

    public enum Kind { ASSET, LIABILITY }
    public record ItemRequest(@NotBlank @Size(max = 100) String name, @NotNull Kind kind,
                              @NotNull @DecimalMin("0.00") @Digits(integer = 17, fraction = 2) BigDecimal amount,
                              @Size(max = 500) String note) {}
    public record ItemLine(UUID id, String name, Kind kind, String amount, String note, Instant createdAt, Instant updatedAt) {}
    public record AccountLine(UUID id, String name, String balance) {}
    public record NetWorthResponse(String accountAssets, String accountLiabilities, String totalAssets,
                                   String totalLiabilities, String netWorth, List<AccountLine> accounts,
                                   List<ItemLine> items, String calculationRule) {}
}

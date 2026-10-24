package com.finsight.merchant;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DataIntegrityViolationException;
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
@RequestMapping("/api/v1/merchants")
public class MerchantController {
    private final JdbcTemplate jdbc;

    public MerchantController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping
    @Transactional(readOnly = true)
    public List<MerchantResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return jdbc.query("SELECT id, name FROM public.merchants WHERE owner_user_id = ? ORDER BY name, id",
                (rs, row) -> new MerchantResponse((UUID) rs.getObject("id"), rs.getString("name")), owner(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public MerchantResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody MerchantRequest request) {
        UUID owner = owner(jwt);
        String name = clean(request.name());
        UUID id = UUID.randomUUID();
        try {
            jdbc.update("INSERT INTO public.merchants (id, owner_user_id, name, normalized_name) VALUES (?, ?, ?, ?)",
                    id, owner, name, normalized(name));
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Merchant name already exists", ex);
        }
        return new MerchantResponse(id, name);
    }

    @PutMapping("/{id}")
    @Transactional
    public MerchantResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                   @Valid @RequestBody MerchantRequest request) {
        UUID owner = owner(jwt);
        String name = clean(request.name());
        try {
            int count = jdbc.update("UPDATE public.merchants SET name = ?, normalized_name = ? "
                    + "WHERE owner_user_id = ? AND id = ?", name, normalized(name), owner, id);
            if (count == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Merchant not found");
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Merchant name already exists", ex);
        }
        return new MerchantResponse(id, name);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        try {
            int count = jdbc.update("DELETE FROM public.merchants WHERE owner_user_id = ? AND id = ?", owner(jwt), id);
            if (count == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Merchant not found");
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Merchant is used by a transaction; change the transaction first", ex);
        }
    }

    private static String clean(String name) {
        String value = name.trim();
        if (value.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Merchant name required");
        return value;
    }

    private static String normalized(String name) { return name.toLowerCase(Locale.ROOT); }

    private static UUID owner(Jwt jwt) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
    }

    public record MerchantRequest(@NotBlank @Size(max = 100) String name) {}
    public record MerchantResponse(UUID id, String name) {}
}

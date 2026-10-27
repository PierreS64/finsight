package com.finsight.category;

import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DataIntegrityViolationException;
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
@RequestMapping("/api/v1/categories")
public class CategoryController {
    private final CategoryRepository categories;

    public CategoryController(CategoryRepository categories) { this.categories = categories; }

    @GetMapping
    @Transactional(readOnly = true)
    public List<CategoryResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return categories.visibleTo(userId(jwt)).stream().map(CategoryResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public CategoryResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CategoryRequest request) {
        UUID owner = userId(jwt);
        String name = request.name().trim();
        requireUnique(owner, name, request.categoryType(), null);
        try {
            return CategoryResponse.from(categories.saveAndFlush(new Category(owner, name, request.categoryType(), request.icon())));
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Category name already exists for this type", ex);
        }
    }

    @PutMapping("/{id}")
    @Transactional
    public CategoryResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                   @Valid @RequestBody CategoryRequest request) {
        UUID owner = userId(jwt);
        Category category = owned(id, owner);
        if (category.getCategoryType() != request.categoryType())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Category type cannot change; create another category instead");
        String name = request.name().trim();
        requireUnique(owner, name, request.categoryType(), id);
        category.update(name, request.categoryType(), request.icon());
        try {
            return CategoryResponse.from(categories.saveAndFlush(category));
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Category name already exists for this type", ex);
        }
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        Category category = owned(id, userId(jwt));
        try {
            categories.delete(category);
            categories.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Category is in use by a transaction or budget; change those records before deletion", ex);
        }
    }

    private Category owned(UUID id, UUID owner) {
        Category category = categories.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
        if (!owner.equals(category.getOwnerUserId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found");
        return category;
    }

    private void requireUnique(UUID owner, String name, Category.Type type, UUID exceptId) {
        boolean exists = categories.visibleTo(owner).stream().anyMatch(category ->
                category.getCategoryType() == type && category.getName().equalsIgnoreCase(name)
                        && !category.getId().equals(exceptId));
        if (exists) throw new ResponseStatusException(HttpStatus.CONFLICT, "Category name already exists for this type");
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
    }

    public record CategoryRequest(@NotBlank @Size(max = 80) String name,
                                  @NotNull Category.Type categoryType,
                                  @NotBlank @Pattern(regexp = "wallet|gift|other|food|transport|home|shopping|health|education") String icon) {}

    public record CategoryResponse(UUID id, String name, Category.Type categoryType, String icon, boolean isDefault) {
        static CategoryResponse from(Category category) {
            return new CategoryResponse(category.getId(), category.getName(), category.getCategoryType(),
                    category.getIcon(), category.getOwnerUserId() == null);
        }
    }
}

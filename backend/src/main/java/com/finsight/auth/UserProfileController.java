package com.finsight.auth;

import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/profile")
public class UserProfileController {
    private final UserProfileRepository profiles;

    public UserProfileController(UserProfileRepository profiles) {
        this.profiles = profiles;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ProfileResponse current(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = userId(jwt);
        UserProfile profile = profiles.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
        return ProfileResponse.from(profile);
    }

    @PutMapping
    @Transactional
    public ProfileResponse update(@AuthenticationPrincipal Jwt jwt,
                                  @Valid @RequestBody UpdateProfileRequest request) {
        UUID userId = userId(jwt);
        UserProfile profile = profiles.findById(userId)
                .orElseGet(() -> new UserProfile(userId));
        profile.setDisplayName(request.displayName().trim());
        return ProfileResponse.from(profiles.save(profile));
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        }
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
    }

    public record UpdateProfileRequest(@NotBlank @Size(max = 80) String displayName) {}

    public record ProfileResponse(UUID userId, String displayName, String currencyCode) {
        static ProfileResponse from(UserProfile profile) {
            return new ProfileResponse(profile.getUserId(), profile.getDisplayName(), profile.getCurrencyCode());
        }
    }
}

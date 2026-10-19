package com.finsight.auth;

import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/session")
public class SessionController {
    @GetMapping
    public Map<String, String> current(Authentication authentication) {
        return Map.of("subject", authentication.getName());
    }
}

package com.finsight.auth;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class UserProfileControllerTests {
    private static final String ALICE = "11111111-1111-4111-8111-111111111111";
    private static final String BOB = "22222222-2222-4222-8222-222222222222";
    private static final String CAROL = "33333333-3333-4333-8333-333333333333";

    @Autowired MockMvc mvc;

    @Test
    void profileIsScopedToTokenSubject() throws Exception {
        mvc.perform(put("/api/v1/profile").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"Alice\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(ALICE));

        mvc.perform(put("/api/v1/profile").with(jwt().jwt(token -> token.subject(BOB)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"Bob\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(BOB));

        mvc.perform(get("/api/v1/profile").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Alice"));
        mvc.perform(get("/api/v1/profile").with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Bob"));
    }

    @Test
    void profileRequiresAuthenticationAndValidInput() throws Exception {
        mvc.perform(get("/api/v1/profile")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/v1/profile").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"   \"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/profile").with(jwt().jwt(token -> token.subject("bad-id"))))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/profile").with(jwt().jwt(token -> token.subject(CAROL))))
                .andExpect(status().isNotFound());
    }
}

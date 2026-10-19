package com.finsight.account;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
class FinancialAccountControllerTests {
    private static final String ALICE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    private static final String BOB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

    @Autowired MockMvc mvc;

    @Test
    void accountListContainsOnlyTheVerifiedOwnerRecords() throws Exception {
        mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Cash\",\"accountType\":\"CASH\",\"openingBalance\":1250000}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.openingBalance").value("1250000"));
        mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(BOB)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Wallet\",\"accountType\":\"E_WALLET\",\"openingBalance\":50000}"))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/accounts").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Cash"))
                .andExpect(jsonPath("$[1]").doesNotExist());
        mvc.perform(get("/api/v1/accounts").with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Wallet"))
                .andExpect(jsonPath("$[1]").doesNotExist());
    }

    @Test
    void accountInputAndAuthenticationAreChecked() throws Exception {
        mvc.perform(get("/api/v1/accounts")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\" \u0020\",\"accountType\":\"CASH\",\"openingBalance\":100}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Invalid\",\"accountType\":\"CASH\",\"openingBalance\":0.001}"))
                .andExpect(status().isBadRequest());
    }
}

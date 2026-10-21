package com.finsight.account;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
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
class AccountReconciliationControllerTests {
    private static final String ALICE = "a6a6a6a6-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    private static final String BOB = "b6b6b6b6-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String account(String owner) throws Exception {
        String body = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Reconcile test\",\"accountType\":\"CASH\",\"openingBalance\":\"100.25\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asText();
    }

    @Test
    void recordsExactDifferenceWithoutChangingBalanceAndHidesOtherOwners() throws Exception {
        String id = account(ALICE);
        String created = mvc.perform(post("/api/v1/accounts/{id}/reconciliations", id)
                        .with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"observedBalance\":\"90.00\",\"note\":\"Kiểm tra tiền mặt\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.expectedBalance").value("100.25"))
                .andExpect(jsonPath("$.differenceAmount").value("-10.25"))
                .andExpect(jsonPath("$.status").value("SHORTFALL"))
                .andReturn().getResponse().getContentAsString();
        String reconciliationId = json.readTree(created).get("id").asText();
        mvc.perform(get("/api/v1/accounts/{id}/reconciliations", id).with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/accounts/{id}/reconciliations", id).with(jwt().jwt(token -> token.subject(BOB)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"observedBalance\":\"100\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/accounts/{id}/reconciliations/{rid}", id, reconciliationId)
                        .with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/accounts").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].currentBalance").value("100.25"));
        mvc.perform(delete("/api/v1/accounts/{id}/reconciliations/{rid}", id, reconciliationId)
                        .with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/accounts/{id}/reconciliations", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void balancedAndSurplusAndInvalidInput() throws Exception {
        String id = account(BOB);
        mvc.perform(post("/api/v1/accounts/{id}/reconciliations", id).with(jwt().jwt(token -> token.subject(BOB)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"observedBalance\":\"100.25\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.differenceAmount").value("0.00"))
                .andExpect(jsonPath("$.status").value("BALANCED"));
        mvc.perform(post("/api/v1/accounts/{id}/reconciliations", id).with(jwt().jwt(token -> token.subject(BOB)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"observedBalance\":\"101.00\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.differenceAmount").value("0.75"))
                .andExpect(jsonPath("$.status").value("SURPLUS"));
        mvc.perform(post("/api/v1/accounts/{id}/reconciliations", id).with(jwt().jwt(token -> token.subject(BOB)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"observedBalance\":\"1.001\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/accounts/{id}/reconciliations", id)).andExpect(status().isUnauthorized());
    }
}

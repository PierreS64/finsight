package com.finsight.transfer;

import static org.hamcrest.Matchers.hasItem;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
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
class AccountTransferControllerTests {
    private static final String ALICE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    private static final String BOB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String account(String owner, String name) throws Exception {
        String body = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"accountType\":\"CASH\",\"openingBalance\":\"100000.00\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asText();
    }

    private static String body(String from, String to, String amount) {
        return "{\"fromAccountId\":\"" + from + "\",\"toAccountId\":\"" + to
                + "\",\"amount\":\"" + amount + "\",\"occurredOn\":\"2026-10-21\",\"note\":\"Chuyển thử\"}";
    }

    @Test
    void transferMovesExactAmountButDoesNotChangeIncomeExpenseOrTotalBalance() throws Exception {
        String from = account(ALICE, "Transfer source");
        String to = account(ALICE, "Transfer target");
        JsonNode before = dashboard();
        String created = mvc.perform(post("/api/v1/transfers").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(from, to, "12500.25")))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.amount").value("12500.25"))
                .andReturn().getResponse().getContentAsString();
        String id = json.readTree(created).get("id").asText();
        mvc.perform(get("/api/v1/accounts").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(jsonPath("$[?(@.id == '" + from + "')].currentBalance").value(hasItem("87499.75")))
                .andExpect(jsonPath("$[?(@.id == '" + to + "')].currentBalance").value(hasItem("112500.25")));
        JsonNode after = dashboard();
        for (String field : new String[] {"totalBalance", "income", "expense", "netFlow", "transactionCount"})
            assertEquals(before.get(field), after.get(field), field + " must not change after a transfer");
        mvc.perform(get("/api/v1/transfers").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(jsonPath("$[?(@.id == '" + id + "')].amount").value(hasItem("12500.25")));
        mvc.perform(delete("/api/v1/transfers/{id}", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/accounts").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(jsonPath("$[?(@.id == '" + from + "')].currentBalance").value(hasItem("100000.00")))
                .andExpect(jsonPath("$[?(@.id == '" + to + "')].currentBalance").value(hasItem("100000.00")));
    }

    private JsonNode dashboard() throws Exception {
        String response = mvc.perform(get("/api/v1/dashboard").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(response);
    }

    @Test
    void transferRejectsOtherOwnersSameAccountAndInvalidAmounts() throws Exception {
        String aliceFrom = account(ALICE, "Protected source");
        String aliceTo = account(ALICE, "Protected target");
        String bobAccount = account(BOB, "Protected Bob");
        mvc.perform(post("/api/v1/transfers").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(aliceFrom, bobAccount, "1")))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/transfers").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(aliceFrom, aliceFrom, "1")))
                .andExpect(status().isBadRequest());
        for (String invalid : new String[] {"0", "-1", "1.001"}) {
            mvc.perform(post("/api/v1/transfers").with(jwt().jwt(token -> token.subject(ALICE)))
                            .contentType(MediaType.APPLICATION_JSON).content(body(aliceFrom, aliceTo, invalid)))
                    .andExpect(status().isBadRequest());
        }
        String created = mvc.perform(post("/api/v1/transfers").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(aliceFrom, aliceTo, "1")))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = json.readTree(created).get("id").asText();
        mvc.perform(get("/api/v1/transfers").with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(jsonPath("$").isEmpty());
        mvc.perform(delete("/api/v1/transfers/{id}", id).with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/transfers")).andExpect(status().isUnauthorized());
    }
}

package com.finsight.insight;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
class WhatIfControllerTests {
    private static final String ALICE = "88888888-8888-4888-8888-888888888888";
    private static final String BOB = "99999999-9999-4999-8999-999999999999";
    private static final String FOOD = "00000000-0000-4000-8000-000000000201";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String account(String owner, String opening) throws Exception {
        String response = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Scenario account\",\"accountType\":\"CASH\",\"openingBalance\":\"" + opening + "\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("id").asText();
    }

    private void expense(String owner, String account, String amount) throws Exception {
        mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accountId\":\"" + account + "\",\"categoryId\":\"" + FOOD
                                + "\",\"kind\":\"EXPENSE\",\"amount\":\"" + amount
                                + "\",\"occurredOn\":\"2026-04-09\"}"))
                .andExpect(status().isCreated());
    }

    private org.springframework.test.web.servlet.ResultActions scenario(String owner, String body) throws Exception {
        return mvc.perform(post("/api/v1/what-if").with(jwt().jwt(token -> token.subject(owner)))
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    void scenariosAreExactOwnerScopedAndNeverPersist() throws Exception {
        String alice = account(ALICE, "100.00");
        String bob = account(BOB, "9000.00");
        expense(ALICE, alice, "30.10");
        expense(BOB, bob, "500.00");
        mvc.perform(put("/api/v1/budgets/total/2026-04").with(jwt().jwt(token -> token.subject(ALICE)))
                .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":\"100.00\"}"))
                .andExpect(status().isOk());
        scenario(ALICE, "{\"month\":\"2026-04\",\"expenseAdjustment\":\"49.90\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.actualExpense").value("30.10"))
                .andExpect(jsonPath("$.projectedExpense").value("80.00"))
                .andExpect(jsonPath("$.actualBalance").value("69.90"))
                .andExpect(jsonPath("$.projectedBalance").value("20.00"))
                .andExpect(jsonPath("$.projectedBudgetRemaining").value("20.00"))
                .andExpect(jsonPath("$.usedPercent").value("80.0"))
                .andExpect(jsonPath("$.alerts[0]").value("NEAR_BUDGET"));
        scenario(ALICE, "{\"month\":\"2026-04\",\"expenseAdjustment\":\"80.00\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.projectedBudgetRemaining").value("-10.10"))
                .andExpect(jsonPath("$.alerts[0]").value("NEGATIVE_BALANCE"))
                .andExpect(jsonPath("$.alerts[1]").value("OVER_BUDGET"));
        scenario(ALICE, "{\"month\":\"2026-04\",\"expenseAdjustment\":\"-10.10\",\"assumedBudgetLimit\":\"40.00\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.projectedExpense").value("20.00"))
                .andExpect(jsonPath("$.projectedBalance").value("80.00"))
                .andExpect(jsonPath("$.projectedBudgetRemaining").value("20.00"));
        scenario(BOB, "{\"month\":\"2026-04\",\"expenseAdjustment\":0}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.actualExpense").value("500.00"))
                .andExpect(jsonPath("$.savedBudgetLimit").isEmpty());
        mvc.perform(get("/api/v1/dashboard").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2026-04"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.expense").value("30.10"))
                .andExpect(jsonPath("$.totalBalance").value("69.90"))
                .andExpect(jsonPath("$.budget.limitAmount").value("100.00"));
    }

    @Test
    void rejectsNegativeProjectedExpenseInvalidMoneyAndMissingAuth() throws Exception {
        scenario(ALICE, "{\"month\":\"2026-04\",\"expenseAdjustment\":\"-1\"}")
                .andExpect(status().isBadRequest());
        scenario(ALICE, "{\"month\":\"2026-04\",\"expenseAdjustment\":\"0.001\"}")
                .andExpect(status().isBadRequest());
        scenario(ALICE, "{\"month\":\"2026-04\",\"expenseAdjustment\":0,\"assumedBudgetLimit\":0}")
                .andExpect(status().isBadRequest());
        scenario(ALICE, "{\"month\":\"bad\",\"expenseAdjustment\":0}")
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/what-if").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"month\":\"2026-04\",\"expenseAdjustment\":0}"))
                .andExpect(status().isUnauthorized());
    }
}

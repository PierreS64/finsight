package com.finsight.dashboard;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
class DashboardControllerTests {
    private static final String ALICE = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    private static final String BOB = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    private static final String FOOD = "00000000-0000-4000-8000-000000000201";
    private static final String SALARY = "00000000-0000-4000-8000-000000000101";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String account(String owner, String opening) throws Exception {
        String response = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Dashboard\",\"accountType\":\"CASH\",\"openingBalance\":\"" + opening + "\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("id").asText();
    }

    private String transaction(String owner, String account, String category, String kind, String amount, String date) throws Exception {
        String response = mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accountId\":\"" + account + "\",\"categoryId\":\"" + category
                                + "\",\"kind\":\"" + kind + "\",\"amount\":\"" + amount
                                + "\",\"occurredOn\":\"" + date + "\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("id").asText();
    }

    @Test
    void dashboardUpdatesFromAccountsTransactionsAndBudgetWithoutCrossOwnerData() throws Exception {
        mvc.perform(get("/api/v1/dashboard").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2026-10"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accountCount").value(0))
                .andExpect(jsonPath("$.transactionCount").value(0))
                .andExpect(jsonPath("$.totalBalance").value("0"))
                .andExpect(jsonPath("$.budget").isEmpty());
        String aliceAccount = account(ALICE, "100000.00");
        String bobAccount = account(BOB, "10");
        transaction(ALICE, aliceAccount, SALARY, "INCOME", "500.25", "2026-10-01");
        String expense = transaction(ALICE, aliceAccount, FOOD, "EXPENSE", "200.10", "2026-10-31");
        transaction(ALICE, aliceAccount, FOOD, "EXPENSE", "50", "2026-11-01");
        transaction(BOB, bobAccount, FOOD, "EXPENSE", "5", "2026-10-01");
        mvc.perform(put("/api/v1/budgets/total/2026-10").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":\"1000\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/dashboard").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2026-10"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accountCount").value(1))
                .andExpect(jsonPath("$.transactionCount").value(2))
                .andExpect(jsonPath("$.totalBalance").value("100250.15"))
                .andExpect(jsonPath("$.income").value("500.25"))
                .andExpect(jsonPath("$.expense").value("200.10"))
                .andExpect(jsonPath("$.netFlow").value("300.15"))
                .andExpect(jsonPath("$.budget.remaining").value("799.90"))
                .andExpect(jsonPath("$.budget.usedPercent").value("20.0"));
        mvc.perform(get("/api/v1/dashboard").with(jwt().jwt(token -> token.subject(BOB)))
                        .param("month", "2026-10"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalBalance").value("5.00"))
                .andExpect(jsonPath("$.expense").value("5.00"))
                .andExpect(jsonPath("$.budget").isEmpty());
        mvc.perform(delete("/api/v1/transactions/{id}", expense).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/dashboard").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2026-10"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.transactionCount").value(1))
                .andExpect(jsonPath("$.totalBalance").value("100450.25"))
                .andExpect(jsonPath("$.expense").value("0"))
                .andExpect(jsonPath("$.budget.remaining").value("1000.00"));
        mvc.perform(get("/api/v1/dashboard").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2026-13"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/dashboard")).andExpect(status().isUnauthorized());
    }
}

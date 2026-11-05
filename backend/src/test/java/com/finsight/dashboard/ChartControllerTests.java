package com.finsight.dashboard;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
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
class ChartControllerTests {
    private static final String ALICE = "44444444-4444-4444-8444-444444444444";
    private static final String BOB = "55555555-5555-4555-8555-555555555555";
    private static final String FOOD = "00000000-0000-4000-8000-000000000201";
    private static final String SALARY = "00000000-0000-4000-8000-000000000101";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String account(String owner) throws Exception {
        String response = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Chart account\",\"accountType\":\"CASH\",\"openingBalance\":\"0\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("id").asText();
    }

    private void transaction(String owner, String account, String category, String kind, String amount, String date) throws Exception {
        mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accountId\":\"" + account + "\",\"categoryId\":\"" + category
                                + "\",\"kind\":\"" + kind + "\",\"amount\":\"" + amount
                                + "\",\"occurredOn\":\"" + date + "\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void chartsKeepWeekMonthBoundariesAndOwnerTotalsExact() throws Exception {
        String alice = account(ALICE);
        String bob = account(BOB);
        transaction(ALICE, alice, FOOD, "EXPENSE", "10.10", "2024-02-01");
        transaction(ALICE, alice, FOOD, "EXPENSE", "20.20", "2024-02-29");
        transaction(ALICE, alice, SALARY, "INCOME", "100.00", "2024-02-05");
        transaction(ALICE, alice, FOOD, "EXPENSE", "8.00", "2024-01-31");
        transaction(BOB, bob, FOOD, "EXPENSE", "500.00", "2024-02-01");
        mvc.perform(get("/api/v1/charts").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2024-02").param("granularity", "week"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.incomeTotal").value("100.00"))
                .andExpect(jsonPath("$.expenseTotal").value("30.30"))
                .andExpect(jsonPath("$.categories[0].categoryId").value(FOOD))
                .andExpect(jsonPath("$.categories[0].amount").value("30.30"))
                .andExpect(jsonPath("$.categories[0].percent").value("100.0"))
                .andExpect(jsonPath("$.buckets.length()").value(5))
                .andExpect(jsonPath("$.buckets[0].from").value("2024-02-01"))
                .andExpect(jsonPath("$.buckets[0].to").value("2024-02-04"))
                .andExpect(jsonPath("$.buckets[0].expense").value("10.10"))
                .andExpect(jsonPath("$.buckets[1].income").value("100.00"))
                .andExpect(jsonPath("$.buckets[4].to").value("2024-02-29"))
                .andExpect(jsonPath("$.buckets[4].expense").value("20.20"));
        mvc.perform(get("/api/v1/charts").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2024-02").param("granularity", "month"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.buckets.length()").value(6))
                .andExpect(jsonPath("$.buckets[4].from").value("2024-01-01"))
                .andExpect(jsonPath("$.buckets[4].expense").value("8.00"))
                .andExpect(jsonPath("$.buckets[5].to").value("2024-02-29"))
                .andExpect(jsonPath("$.buckets[5].expense").value("30.30"));
        mvc.perform(get("/api/v1/charts").with(jwt().jwt(token -> token.subject(BOB)))
                        .param("month", "2024-02"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.expenseTotal").value("500.00"));
    }

    @Test
    void emptyPeriodsAndInvalidRequestsAreExplicit() throws Exception {
        mvc.perform(get("/api/v1/charts").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2025-03"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.categories.length()").value(0))
                .andExpect(jsonPath("$.expenseTotal").value("0"));
        mvc.perform(get("/api/v1/charts").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "bad"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/charts").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("granularity", "day"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/charts")).andExpect(status().isUnauthorized());
    }
}

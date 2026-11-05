package com.finsight.insight;

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
class SpendingTrendControllerTests {
    private static final String ALICE = "12341234-1234-4234-8234-123412341234";
    private static final String BOB = "23452345-2345-4345-8345-234523452345";
    private static final String FOOD = "00000000-0000-4000-8000-000000000201";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String account(String owner) throws Exception {
        String response = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Trend account\",\"accountType\":\"CASH\",\"openingBalance\":\"0\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("id").asText();
    }

    private void expense(String owner, String account, String amount, String date) throws Exception {
        mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accountId\":\"" + account + "\",\"categoryId\":\"" + FOOD
                                + "\",\"kind\":\"EXPENSE\",\"amount\":\"" + amount
                                + "\",\"occurredOn\":\"" + date + "\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void historicalLeapMonthAndPartialLastWeekUseExactOwnerComparisons() throws Exception {
        String alice = account(ALICE);
        String bob = account(BOB);
        expense(ALICE, alice, "100.00", "2024-01-31");
        expense(ALICE, alice, "88.00", "2024-02-01");
        expense(ALICE, alice, "20.00", "2024-02-20");
        expense(ALICE, alice, "22.00", "2024-02-29");
        expense(BOB, bob, "999.00", "2024-02-29");
        mvc.perform(get("/api/v1/spending-trends").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2024-02"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.week.from").value("2024-02-26"))
                .andExpect(jsonPath("$.week.to").value("2024-02-29"))
                .andExpect(jsonPath("$.week.previousFrom").value("2024-02-19"))
                .andExpect(jsonPath("$.week.previousTo").value("2024-02-22"))
                .andExpect(jsonPath("$.week.expense").value("22.00"))
                .andExpect(jsonPath("$.week.previousExpense").value("20.00"))
                .andExpect(jsonPath("$.week.changePercent").value("10.0"))
                .andExpect(jsonPath("$.week.direction").value("INCREASE"))
                .andExpect(jsonPath("$.monthComparison.expense").value("130.00"))
                .andExpect(jsonPath("$.monthComparison.previousExpense").value("100.00"))
                .andExpect(jsonPath("$.monthComparison.changeAmount").value("30.00"));
        mvc.perform(get("/api/v1/spending-trends").with(jwt().jwt(token -> token.subject(BOB)))
                        .param("month", "2024-02"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.monthComparison.expense").value("999.00"))
                .andExpect(jsonPath("$.monthComparison.changePercent").isEmpty());
    }

    @Test
    void missingComparisonAndInvalidDatesAreExplicit() throws Exception {
        mvc.perform(get("/api/v1/spending-trends").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2025-03"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.monthComparison.direction").value("INSUFFICIENT_DATA"))
                .andExpect(jsonPath("$.monthComparison.changePercent").isEmpty());
        mvc.perform(get("/api/v1/spending-trends").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "bad"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/spending-trends").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "9999-01"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/spending-trends")).andExpect(status().isUnauthorized());
    }
}

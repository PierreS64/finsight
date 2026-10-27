package com.finsight.insight;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
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
class SpendingProfileControllerTests {
    private static final String ALICE = "66666666-6666-4666-8666-666666666666";
    private static final String BOB = "77777777-7777-4777-8777-777777777777";
    private static final String FOOD = "00000000-0000-4000-8000-000000000201";
    private static final String SALARY = "00000000-0000-4000-8000-000000000101";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String account(String owner) throws Exception {
        String response = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Profile account\",\"accountType\":\"CASH\",\"openingBalance\":\"0\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("id").asText();
    }

    private String category(String owner) throws Exception {
        String response = mvc.perform(post("/api/v1/categories").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Profile travel\",\"categoryType\":\"EXPENSE\",\"icon\":\"transport\"}"))
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
    void profileCalculatesExactRatesTopCategoryStabilityAndDailyTrend() throws Exception {
        String alice = account(ALICE);
        String bob = account(BOB);
        String travel = category(ALICE);
        transaction(ALICE, alice, FOOD, "EXPENSE", "310", "2026-03-31");
        transaction(ALICE, alice, FOOD, "EXPENSE", "200", "2026-04-01");
        transaction(ALICE, alice, travel, "EXPENSE", "130", "2026-04-30");
        mvc.perform(get("/api/v1/spending-profile").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2026-04"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.savingsRatePercent").isEmpty());
        transaction(ALICE, alice, SALARY, "INCOME", "1000", "2026-04-15");
        transaction(BOB, bob, FOOD, "EXPENSE", "999", "2026-04-15");
        mvc.perform(get("/api/v1/spending-profile").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2026-04"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.elapsedDays").value(30))
                .andExpect(jsonPath("$.income").value("1000.00"))
                .andExpect(jsonPath("$.expense").value("330.00"))
                .andExpect(jsonPath("$.savingsRatePercent").value("67.0"))
                .andExpect(jsonPath("$.averageDailyExpense").value("11.00"))
                .andExpect(jsonPath("$.stabilityScore").value("0.0"))
                .andExpect(jsonPath("$.topExpenseCategory.amount").value("200.00"))
                .andExpect(jsonPath("$.trend").value("INCREASE"))
                .andExpect(jsonPath("$.trendPercent").value("10.0"));
    }

    @Test
    void stabilityIsHundredForEvenDailySpendingAndZeroWhenConcentrated() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        Map<LocalDate, BigDecimal> even = new HashMap<>();
        for (int day = 0; day < 7; day++) even.put(start.plusDays(day), BigDecimal.TEN);
        assertEquals("100.0", SpendingProfileController.stabilityScore(even, start, 7, new BigDecimal("70")));
        assertEquals("0.0", SpendingProfileController.stabilityScore(Map.of(start, new BigDecimal("70")),
                start, 7, new BigDecimal("70")));
    }

    @Test
    void missingDataDoesNotInventSavingsOrTrendAndRequestsAreProtected() throws Exception {
        mvc.perform(get("/api/v1/spending-profile").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2024-02"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.elapsedDays").value(29))
                .andExpect(jsonPath("$.savingsRatePercent").isEmpty())
                .andExpect(jsonPath("$.stabilityScore").isEmpty())
                .andExpect(jsonPath("$.topExpenseCategory").isEmpty())
                .andExpect(jsonPath("$.trend").value("INSUFFICIENT_DATA"));
        mvc.perform(get("/api/v1/spending-profile").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "bad"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/spending-profile")).andExpect(status().isUnauthorized());
    }
}

package com.finsight.insight;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
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
class ExpenseForecastControllerTests {
    private static final String ALICE = "34563456-3456-4456-8456-345634563456";
    private static final String BOB = "45674567-4567-4567-8567-456745674567";
    private static final String FOOD = "00000000-0000-4000-8000-000000000201";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void forecastHandlesLeapMonthSparseDataAndExactMoney() {
        var leap = ExpenseForecastController.calculate(LocalDate.of(2024, 2, 14), new BigDecimal("140.00"), 7);
        assertEquals(15, leap.remainingDays());
        assertEquals("10.00", leap.averageDaily());
        assertEquals("290.00", leap.projectedMonthEnd());
        assertEquals("HIGH", leap.confidence());
        var lastDay = ExpenseForecastController.calculate(LocalDate.of(2024, 2, 29), new BigDecimal("29.01"), 3);
        assertEquals("29.01", lastDay.projectedMonthEnd());
        assertEquals("0.00", lastDay.expectedAdditional());
        var sparse = ExpenseForecastController.calculate(LocalDate.of(2026, 10, 2), new BigDecimal("100"), 2);
        assertNull(sparse.projectedMonthEnd());
        assertEquals("INSUFFICIENT_DATA", sparse.confidence());
        var empty = ExpenseForecastController.calculate(LocalDate.of(2026, 10, 21), BigDecimal.ZERO, 0);
        assertNull(empty.averageDaily());
    }

    private String account(String owner) throws Exception {
        String response = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Forecast account\",\"accountType\":\"CASH\",\"openingBalance\":\"0\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("id").asText();
    }

    private void expense(String owner, String account, String amount, LocalDate date) throws Exception {
        mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accountId\":\"" + account + "\",\"categoryId\":\"" + FOOD
                                + "\",\"kind\":\"EXPENSE\",\"amount\":\"" + amount
                                + "\",\"occurredOn\":\"" + date + "\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void forecastReadsOnlyAuthenticatedOwnersExpense() throws Exception {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Bangkok"));
        String alice = account(ALICE);
        String bob = account(BOB);
        expense(ALICE, alice, "10.10", today.withDayOfMonth(1));
        expense(ALICE, alice, "20.20", today);
        expense(BOB, bob, "999.00", today);
        mvc.perform(get("/api/v1/expense-forecast").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.spent").value("30.30"))
                .andExpect(jsonPath("$.spendingDays").value(today.getDayOfMonth() == 1 ? 1 : 2));
        mvc.perform(get("/api/v1/expense-forecast").with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.spent").value("999.00"));
        mvc.perform(get("/api/v1/expense-forecast")).andExpect(status().isUnauthorized());
    }
}

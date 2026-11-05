package com.finsight.insight;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
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
class SafeToSpendControllerTests {
    private static final String OWNER = "9abc9abc-9abc-4abc-8abc-9abc9abc9abc";
    private static final String OTHER = "abcdabcd-abcd-4bcd-8bcd-abcdabcdabcd";
    private static final String FOOD = "00000000-0000-4000-8000-000000000201";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void safeAmountReservesOnlyUnprocessedOccurrencesAndNeverGoesPositiveAfterOverrun() throws Exception {
        String month = YearMonth.now(ZoneId.of("Asia/Bangkok")).toString();
        String today = LocalDate.now(ZoneId.of("Asia/Bangkok")).toString();
        mvc.perform(get("/api/v1/safe-to-spend").with(jwt().jwt(token -> token.subject(OTHER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("NO_BUDGET"))
                .andExpect(jsonPath("$.safePerDay").doesNotExist());
        String accountResponse = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Safe account\",\"accountType\":\"CASH\",\"openingBalance\":\"0\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String account = json.readTree(accountResponse).get("id").asText();
        mvc.perform(put("/api/v1/budgets/total/{month}", month).with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":\"100.00\"}"))
                .andExpect(status().isOk());
        String ruleResponse = mvc.perform(post("/api/v1/recurring-rules").with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accountId\":\"" + account + "\",\"categoryId\":\"" + FOOD
                                + "\",\"name\":\"Rent\",\"kind\":\"EXPENSE\",\"amount\":\"20.00\","
                                + "\"cadence\":\"MONTHLY\",\"nextDueOn\":\"" + today + "\",\"active\":true}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = json.readTree(ruleResponse).get("id").asText();
        JsonNode before = json.readTree(mvc.perform(get("/api/v1/safe-to-spend")
                        .with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.upcomingExpense").value("20.00"))
                .andExpect(jsonPath("$.availableAfterReservations").value("80.00"))
                .andReturn().getResponse().getContentAsString());
        int days = YearMonth.now(ZoneId.of("Asia/Bangkok")).atEndOfMonth().getDayOfMonth()
                - LocalDate.now(ZoneId.of("Asia/Bangkok")).getDayOfMonth() + 1;
        assertEquals(new BigDecimal("80.00").divide(BigDecimal.valueOf(days), 2, RoundingMode.DOWN).toPlainString(),
                before.get("safePerDay").asText());
        mvc.perform(post("/api/v1/recurring-rules/{id}/process", id).with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/safe-to-spend").with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.spent").value("20.00"))
                .andExpect(jsonPath("$.upcomingExpense").value("0"))
                .andExpect(jsonPath("$.availableAfterReservations").value("80.00"))
                .andExpect(jsonPath("$.safePerDay").value(before.get("safePerDay").asText()));
        mvc.perform(put("/api/v1/budgets/total/{month}", month).with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":\"10.00\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/safe-to-spend").with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("BUDGET_EXHAUSTED"))
                .andExpect(jsonPath("$.budgetRemaining").value("-10.00"))
                .andExpect(jsonPath("$.safePerDay").value("0.00"));
        mvc.perform(get("/api/v1/safe-to-spend")).andExpect(status().isUnauthorized());
    }

    @Test
    void remainingDaysIncludesLastDayOfLeapFebruary() {
        assertEquals(2, SafeToSpendController.remainingDays(LocalDate.of(2024, 2, 28)));
        assertEquals(1, SafeToSpendController.remainingDays(LocalDate.of(2024, 2, 29)));
        assertEquals(1, SafeToSpendController.remainingDays(LocalDate.of(2025, 2, 28)));
    }
}

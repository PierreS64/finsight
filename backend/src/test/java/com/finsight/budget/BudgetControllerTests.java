package com.finsight.budget;

import static org.junit.jupiter.api.Assertions.assertEquals;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
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
class BudgetControllerTests {
    private static final String ALICE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    private static final String BOB = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    private static final String FOOD = "00000000-0000-4000-8000-000000000201";
    private static final String SALARY = "00000000-0000-4000-8000-000000000101";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void alertThresholdUsesExactBoundariesAndHighestLevel() {
        BigDecimal limit = new BigDecimal("100.00");
        assertEquals(0, BudgetAlertThreshold.highest(new BigDecimal("79.99"), limit));
        assertEquals(80, BudgetAlertThreshold.highest(new BigDecimal("80.00"), limit));
        assertEquals(80, BudgetAlertThreshold.highest(new BigDecimal("89.99"), limit));
        assertEquals(90, BudgetAlertThreshold.highest(new BigDecimal("90.00"), limit));
        assertEquals(100, BudgetAlertThreshold.highest(new BigDecimal("100.00"), limit));
        assertEquals(100, BudgetAlertThreshold.highest(new BigDecimal("120.00"), limit));
        assertEquals(0, BudgetAlertThreshold.highest(BigDecimal.ONE, BigDecimal.ZERO));
    }

    private String account(String owner, String name) throws Exception {
        String body = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"accountType\":\"CASH\",\"openingBalance\":\"0\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asText();
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
    void budgetsUseExactOwnerScopedMonthlyExpenseAndHandleOverrun() throws Exception {
        String aliceAccount = account(ALICE, "Budget Alice");
        String bobAccount = account(BOB, "Budget Bob");
        transaction(ALICE, aliceAccount, FOOD, "EXPENSE", "100.25", "2026-03-31");
        transaction(ALICE, aliceAccount, FOOD, "EXPENSE", "10", "2026-04-01");
        transaction(ALICE, aliceAccount, SALARY, "INCOME", "5000", "2026-03-15");
        transaction(BOB, bobAccount, FOOD, "EXPENSE", "1000", "2026-03-01");
        mvc.perform(get("/api/v1/budgets").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2026-02"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalSpent").value("0"))
                .andExpect(jsonPath("$.total").isEmpty());
        mvc.perform(put("/api/v1/budgets/total/2026-03").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":\"80\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total.spent").value("100.25"))
                .andExpect(jsonPath("$.total.remaining").value("-20.25"))
                .andExpect(jsonPath("$.total.usedPercent").value("125.3"));
        mvc.perform(put("/api/v1/budgets/categories/2026-03/{id}", FOOD)
                        .with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":\"50\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.categories[0].values.remaining").value("-50.25"))
                .andExpect(jsonPath("$.categories[0].values.usedPercent").value("200.5"));
        mvc.perform(put("/api/v1/budgets/total/2026-03").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":\"200\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total.remaining").value("99.75"));
        transaction(ALICE, aliceAccount, FOOD, "EXPENSE", "20", "2026-03-01");
        mvc.perform(get("/api/v1/budgets").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2026-03"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total.spent").value("120.25"))
                .andExpect(jsonPath("$.total.remaining").value("79.75"))
                .andExpect(jsonPath("$.categories[0].values.spent").value("120.25"));
        mvc.perform(get("/api/v1/budgets").with(jwt().jwt(token -> token.subject(BOB)))
                        .param("month", "2026-03"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalSpent").value("1000.00"))
                .andExpect(jsonPath("$.total").isEmpty()).andExpect(jsonPath("$.categories").isEmpty());
        mvc.perform(get("/api/v1/budgets").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2026-04"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalSpent").value("10.00"));
        mvc.perform(delete("/api/v1/budgets/categories/2026-03/{id}", FOOD)
                        .with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
        mvc.perform(delete("/api/v1/budgets/total/2026-03").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/budgets").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2026-03"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").isEmpty())
                .andExpect(jsonPath("$.categories").isEmpty());
    }

    @Test
    void rejectsInvalidLimitIncomeCategoryAndOtherOwnersCategory() throws Exception {
        String created = mvc.perform(post("/api/v1/categories").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Budget private\",\"categoryType\":\"EXPENSE\",\"icon\":\"food\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String privateCategory = json.readTree(created).get("id").asText();
        mvc.perform(put("/api/v1/budgets/categories/2026-03/{id}", privateCategory)
                        .with(jwt().jwt(token -> token.subject(BOB)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":\"100\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/budgets/categories/2026-03/{id}", SALARY)
                        .with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":\"100\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/budgets/total/2026-03").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":\"0\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/budgets/total/2026-03").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":\"1.001\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/budgets").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2026-13"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/budgets")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/v1/budgets/categories/2026-03/{id}", privateCategory)
                        .with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":\"100\"}"))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/v1/categories/{id}", privateCategory)
                        .with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isConflict());
        mvc.perform(delete("/api/v1/budgets/categories/2026-03/{id}", privateCategory)
                        .with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
        mvc.perform(delete("/api/v1/categories/{id}", privateCategory)
                        .with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
    }
}

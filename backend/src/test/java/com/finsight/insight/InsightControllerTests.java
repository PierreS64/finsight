package com.finsight.insight;

import static org.hamcrest.Matchers.hasItem;
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
class InsightControllerTests {
    private static final String ALICE = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    private static final String BOB = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    private static final String FOOD = "00000000-0000-4000-8000-000000000201";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String account(String owner) throws Exception {
        String body = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Insight account\",\"accountType\":\"CASH\",\"openingBalance\":\"0\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asText();
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
    void cardsUseExactTwentyAndEightyPercentBoundaries() throws Exception {
        String alice = account(ALICE);
        expense(ALICE, alice, "100.00", "2026-01-31");
        mvc.perform(get("/api/v1/insights").with(jwt().jwt(token -> token.subject(ALICE))).param("month", "2026-01"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.cards").isEmpty());
        expense(ALICE, alice, "119.99", "2026-02-01");
        mvc.perform(get("/api/v1/insights").with(jwt().jwt(token -> token.subject(ALICE))).param("month", "2026-02"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.cards").isEmpty());
        mvc.perform(put("/api/v1/budgets/total/2026-02").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":\"150\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/insights").with(jwt().jwt(token -> token.subject(ALICE))).param("month", "2026-02"))
                .andExpect(jsonPath("$.cards").isEmpty());
        expense(ALICE, alice, "0.01", "2026-02-28");
        mvc.perform(get("/api/v1/insights").with(jwt().jwt(token -> token.subject(ALICE))).param("month", "2026-02"))
                .andExpect(jsonPath("$.cards[?(@.type == 'SPENDING_INCREASE')].currentAmount").value(hasItem("120.00")))
                .andExpect(jsonPath("$.cards[?(@.type == 'BUDGET_NEAR_LIMIT')].thresholdPercent").value(hasItem("80")));
        expense(ALICE, alice, "30.00", "2026-02-28");
        mvc.perform(get("/api/v1/insights").with(jwt().jwt(token -> token.subject(ALICE))).param("month", "2026-02"))
                .andExpect(jsonPath("$.cards[?(@.type == 'BUDGET_REACHED')].severity").value(hasItem("CRITICAL")))
                .andExpect(jsonPath("$.cards[?(@.type == 'BUDGET_REACHED')].referenceAmount").value(hasItem("150.00")));
    }

    @Test
    void categoryCardsAndOwnerIsolationHandleNoData() throws Exception {
        String alice = account(ALICE);
        String bob = account(BOB);
        expense(BOB, bob, "1000", "2026-05-10");
        mvc.perform(put("/api/v1/budgets/categories/2026-05/{id}", FOOD)
                        .with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":\"100\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/insights").with(jwt().jwt(token -> token.subject(ALICE))).param("month", "2026-05"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.cards").isEmpty());
        expense(ALICE, alice, "80", "2026-05-31");
        mvc.perform(get("/api/v1/insights").with(jwt().jwt(token -> token.subject(ALICE))).param("month", "2026-05"))
                .andExpect(jsonPath("$.cards[0].type").value("BUDGET_NEAR_LIMIT"))
                .andExpect(jsonPath("$.cards[0].currentAmount").value("80.00"))
                .andExpect(jsonPath("$.cards[0].referenceAmount").value("100.00"));
        mvc.perform(get("/api/v1/insights").with(jwt().jwt(token -> token.subject(BOB))).param("month", "2026-05"))
                .andExpect(jsonPath("$.cards").isEmpty());
        mvc.perform(get("/api/v1/insights").with(jwt().jwt(token -> token.subject(ALICE))).param("month", "bad"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/insights")).andExpect(status().isUnauthorized());
    }
}

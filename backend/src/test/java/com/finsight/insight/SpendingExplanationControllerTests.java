package com.finsight.insight;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import com.fasterxml.jackson.databind.JsonNode;
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
class SpendingExplanationControllerTests {
    private static final String ALICE = "11111111-1111-4111-8111-111111111111";
    private static final String BOB = "22222222-2222-4222-8222-222222222222";
    private static final String FOOD = "00000000-0000-4000-8000-000000000201";
    private static final String SALARY = "00000000-0000-4000-8000-000000000101";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String account(String owner) throws Exception {
        String response = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Explanation account\",\"accountType\":\"CASH\",\"openingBalance\":\"0\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("id").asText();
    }

    private String category(String owner, String name) throws Exception {
        String response = mvc.perform(post("/api/v1/categories").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"categoryType\":\"EXPENSE\",\"icon\":\"other\"}"))
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

    private JsonNode explanation(String owner, String month) throws Exception {
        String response = mvc.perform(get("/api/v1/spending-explanation")
                        .with(jwt().jwt(token -> token.subject(owner))).param("month", month))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(response);
    }

    @Test
    void categoryDeltasSumToNetChangeEvenWhenTheyOffsetAcrossYearBoundary() throws Exception {
        String alice = account(ALICE);
        String transport = category(ALICE, "Transport explain");
        String shopping = category(ALICE, "Shopping explain");
        transaction(ALICE, alice, FOOD, "EXPENSE", "100", "2025-12-31");
        transaction(ALICE, alice, transport, "EXPENSE", "50", "2025-12-01");
        transaction(ALICE, alice, FOOD, "EXPENSE", "130", "2026-01-01");
        transaction(ALICE, alice, transport, "EXPENSE", "20", "2026-01-31");
        transaction(ALICE, alice, shopping, "EXPENSE", "10", "2026-01-15");
        JsonNode result = explanation(ALICE, "2026-01");
        assertEquals("2025-12", result.get("previousMonth").asText());
        assertEquals(0, new BigDecimal(result.get("previousTotal").asText()).compareTo(new BigDecimal("150")));
        assertEquals(0, new BigDecimal(result.get("currentTotal").asText()).compareTo(new BigDecimal("160")));
        assertEquals(0, new BigDecimal(result.get("changeAmount").asText()).compareTo(new BigDecimal("10")));
        BigDecimal categoryChange = BigDecimal.ZERO;
        BigDecimal contribution = BigDecimal.ZERO;
        for (JsonNode row : result.get("categories")) {
            categoryChange = categoryChange.add(new BigDecimal(row.get("changeAmount").asText()));
            contribution = contribution.add(new BigDecimal(row.get("contributionPercent").asText()));
        }
        assertEquals(0, categoryChange.compareTo(new BigDecimal("10")));
        assertEquals(0, contribution.compareTo(new BigDecimal("100")));
        assertEquals(3, result.get("categories").size());
    }

    @Test
    void emptyPeriodsDecreasesAndOtherOwnersRemainSeparate() throws Exception {
        String alice = account(ALICE);
        String bob = account(BOB);
        JsonNode empty = explanation(ALICE, "2026-06");
        assertEquals("0", empty.get("changeAmount").asText());
        assertEquals(0, empty.get("categories").size());
        transaction(ALICE, alice, FOOD, "EXPENSE", "25", "2026-07-20");
        transaction(ALICE, alice, SALARY, "INCOME", "10", "2026-08-01");
        transaction(BOB, bob, FOOD, "EXPENSE", "999", "2026-08-01");
        JsonNode decrease = explanation(ALICE, "2026-08");
        assertEquals(0, new BigDecimal(decrease.get("changeAmount").asText()).compareTo(new BigDecimal("-25")));
        assertEquals(0, new BigDecimal(decrease.get("categories").get(0).get("contributionPercent").asText()).compareTo(new BigDecimal("100")));
        mvc.perform(get("/api/v1/spending-explanation").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "invalid"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/spending-explanation")).andExpect(status().isUnauthorized());
    }
}

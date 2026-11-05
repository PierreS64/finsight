package com.finsight.recurring;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
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
class RecurringRuleControllerTests {
    private static final String ALICE = "56785678-5678-4678-8678-567856785678";
    private static final String BOB = "67896789-6789-4789-8789-678967896789";
    private static final String FOOD = "00000000-0000-4000-8000-000000000201";
    private static final String SALARY = "00000000-0000-4000-8000-000000000101";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void monthlyAnchorPreservesLastDayAndWeeklyCrossesYear() {
        LocalDate januaryEnd = LocalDate.of(2024, 1, 31);
        LocalDate februaryEnd = RecurringRuleController.advance(januaryEnd, RecurringRuleController.Cadence.MONTHLY, 31, true);
        assertEquals(LocalDate.of(2024, 2, 29), februaryEnd);
        assertEquals(LocalDate.of(2024, 3, 31), RecurringRuleController.advance(februaryEnd,
                RecurringRuleController.Cadence.MONTHLY, 31, true));
        LocalDate februaryFrom30th = RecurringRuleController.advance(LocalDate.of(2024, 1, 30),
                RecurringRuleController.Cadence.MONTHLY, 30, false);
        assertEquals(LocalDate.of(2024, 2, 29), februaryFrom30th);
        assertEquals(LocalDate.of(2024, 3, 30), RecurringRuleController.advance(februaryFrom30th,
                RecurringRuleController.Cadence.MONTHLY, 30, false));
        assertEquals(LocalDate.of(2025, 1, 7), RecurringRuleController.advance(LocalDate.of(2024, 12, 31),
                RecurringRuleController.Cadence.WEEKLY, 31, true));
    }

    private String account(String owner) throws Exception {
        String response = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Recurring account\",\"accountType\":\"CASH\",\"openingBalance\":\"0\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("id").asText();
    }

    private String body(String account, String category, String date, boolean active) {
        return "{\"accountId\":\"" + account + "\",\"categoryId\":\"" + category
                + "\",\"name\":\"Internet\",\"kind\":\"EXPENSE\",\"amount\":\"10.10\","
                + "\"cadence\":\"MONTHLY\",\"nextDueOn\":\"" + date + "\",\"active\":" + active + "}";
    }

    @Test
    void processIsExplicitIdempotentAndOwnerScoped() throws Exception {
        String aliceAccount = account(ALICE);
        String bobAccount = account(BOB);
        String today = LocalDate.now(ZoneId.of("Asia/Bangkok")).toString();
        String created = mvc.perform(post("/api/v1/recurring-rules").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(aliceAccount, FOOD, today, true)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.amount").value("10.10"))
                .andReturn().getResponse().getContentAsString();
        String id = json.readTree(created).get("id").asText();
        mvc.perform(get("/api/v1/recurring-rules").with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
        mvc.perform(post("/api/v1/recurring-rules/{id}/process", id).with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/recurring-rules/{id}/process", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.createdTransactions").value(1));
        mvc.perform(post("/api/v1/recurring-rules/{id}/process", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.createdTransactions").value(0));
        mvc.perform(put("/api/v1/recurring-rules/{id}", id).with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(aliceAccount, FOOD, today, true)))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/recurring-rules/{id}/process", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.createdTransactions").value(0));
        mvc.perform(get("/api/v1/transactions").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(put("/api/v1/recurring-rules/{id}", id).with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(aliceAccount, FOOD, today, false)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(false));
        mvc.perform(post("/api/v1/recurring-rules/{id}/process", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isConflict());
        mvc.perform(put("/api/v1/recurring-rules/{id}", id).with(jwt().jwt(token -> token.subject(BOB)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(bobAccount, FOOD, today, true)))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/recurring-rules").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(aliceAccount, SALARY, today, true)))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/recurring-rules").with(jwt().jwt(token -> token.subject(BOB)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(bobAccount, FOOD, today, false)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.active").value(false));
        mvc.perform(get("/api/v1/recurring-rules")).andExpect(status().isUnauthorized());
    }
}

package com.finsight.goal;

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
class FinancialGoalControllerTests {
    private static final String ALICE = "a5a5a5a5-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    private static final String BOB = "b5b5b5b5-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private static String request(String target, String saved, String date) {
        return "{\"name\":\"Quỹ học tập\",\"targetAmount\":\"" + target
                + "\",\"savedAmount\":\"" + saved + "\",\"targetDate\":\"" + date + "\"}";
    }

    @Test
    void crudCalculatesExactProgressAndHidesOtherOwners() throws Exception {
        mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Goal balance check\",\"accountType\":\"CASH\",\"openingBalance\":\"5000.00\"}"))
                .andExpect(status().isCreated());
        String created = mvc.perform(post("/api/v1/goals").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(request("1000.00", "250.25", "2099-12-31")))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.remainingAmount").value("749.75"))
                .andExpect(jsonPath("$.progressPercent").value("25.0"))
                .andExpect(jsonPath("$.achieved").value(false))
                .andReturn().getResponse().getContentAsString();
        String id = json.readTree(created).get("id").asText();
        mvc.perform(get("/api/v1/goals").with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
        mvc.perform(put("/api/v1/goals/{id}", id).with(jwt().jwt(token -> token.subject(BOB)))
                        .contentType(MediaType.APPLICATION_JSON).content(request("100", "100", "2099-12-31")))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/goals/{id}", id).with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/goals/{id}", id).with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(request("1000", "1100", "2000-01-01")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.remainingAmount").value("0.00"))
                .andExpect(jsonPath("$.progressPercent").value("100"))
                .andExpect(jsonPath("$.achieved").value(true)).andExpect(jsonPath("$.overdue").value(false));
        mvc.perform(get("/api/v1/accounts").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].currentBalance").value("5000.00"));
        mvc.perform(delete("/api/v1/goals/{id}", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/goals").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void rejectsInvalidMoneyAndRequiresAuth() throws Exception {
        mvc.perform(post("/api/v1/goals").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(request("0", "0", "2099-12-31")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/goals").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(request("100", "-1", "2099-12-31")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/goals").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(request("100.001", "0", "2099-12-31")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/goals").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(request("100", "0", "bad-date")))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/goals")).andExpect(status().isUnauthorized());
    }
}

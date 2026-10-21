package com.finsight.recurring;

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
class UpcomingExpenseControllerTests {
    private static final String OWNER = "789a789a-789a-489a-889a-789a789a789a";
    private static final String OTHER = "89ab89ab-89ab-49ab-89ab-89ab89ab89ab";
    private static final String FOOD = "00000000-0000-4000-8000-000000000201";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String account() throws Exception {
        String result = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Upcoming account\",\"accountType\":\"CASH\",\"openingBalance\":\"0\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(result).get("id").asText();
    }

    private String body(String account, String date, boolean active, String kind) {
        return "{\"accountId\":\"" + account + "\",\"categoryId\":\"" + FOOD
                + "\",\"name\":\"Rent\",\"kind\":\"" + kind + "\",\"amount\":\"123.45\","
                + "\"cadence\":\"MONTHLY\",\"nextDueOn\":\"" + date + "\",\"active\":" + active + "}";
    }

    @Test
    void listsOverdueAndEndOfMonthWithoutOtherOwnersOrPausedRules() throws Exception {
        String account = account();
        String old = "2024-01-31";
        String result = mvc.perform(post("/api/v1/recurring-rules").with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(account, old, true, "EXPENSE")))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = json.readTree(result).get("id").asText();
        mvc.perform(get("/api/v1/upcoming-expenses?from=2024-02-01&to=2024-03-31")
                        .with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(2))
                .andExpect(jsonPath("$.total").value("246.90"))
                .andExpect(jsonPath("$.items[0].dueOn").value("2024-02-29"))
                .andExpect(jsonPath("$.items[1].dueOn").value("2024-03-31"))
                .andExpect(jsonPath("$.items[0].overdue").value(true));
        mvc.perform(get("/api/v1/upcoming-expenses?from=2024-02-01&to=2024-03-31")
                        .with(jwt().jwt(token -> token.subject(OTHER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(0));
        mvc.perform(put("/api/v1/recurring-rules/{id}", id).with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(account, old, false, "EXPENSE")))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/upcoming-expenses?from=2024-02-01&to=2024-03-31")
                        .with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(0));
    }

    @Test
    void excludesProcessedOccurrenceAndRejectsInvalidRange() throws Exception {
        String account = account();
        String today = LocalDate.now(ZoneId.of("Asia/Bangkok")).toString();
        String result = mvc.perform(post("/api/v1/recurring-rules").with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(account, today, true, "EXPENSE")))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = json.readTree(result).get("id").asText();
        mvc.perform(get("/api/v1/upcoming-expenses?from=" + today + "&to=" + today)
                        .with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1));
        mvc.perform(post("/api/v1/recurring-rules/{id}/process", id).with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/upcoming-expenses?from=" + today + "&to=" + today)
                        .with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(0))
                .andExpect(jsonPath("$.total").value("0"));
        mvc.perform(get("/api/v1/upcoming-expenses?from=2024-03-02&to=2024-03-01")
                        .with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/upcoming-expenses")).andExpect(status().isUnauthorized());
    }
}

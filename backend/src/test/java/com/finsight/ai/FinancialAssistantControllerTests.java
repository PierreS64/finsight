package com.finsight.ai;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class FinancialAssistantControllerTests {
    private static final String OWNER = "46464646-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    private static final String OTHER = "46464646-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockitoBean ExplanationClient explanations;

    @Test
    void usesOnlyAuthenticatedOwnersAggregatesAndDoesNotCallModelWithoutData() throws Exception {
        mvc.perform(post("/api/v1/assistant/ask").with(jwt().jwt(token -> token.subject(OTHER)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"Tình hình của tôi?\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.source").value("NO_DATA"));
        verify(explanations, never()).explain(eq("Tình hình của tôi?"), anyList());

        String created = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Quỹ riêng\",\"accountType\":\"CASH\",\"openingBalance\":\"250.25\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String accountId = json.readTree(created).get("id").asText();
        when(explanations.explain(eq("Số dư thế nào?"), anyList()))
                .thenReturn(new ExplanationClient.Explanation("Số dư đã được xác minh bên dưới.", "AI_EXPLANATION"));
        mvc.perform(post("/api/v1/assistant/ask").with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"Số dư thế nào?\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.source").value("AI_EXPLANATION"))
                .andExpect(jsonPath("$.verifiedFacts[3].value").value("250.25"));
        ArgumentCaptor<List<FinancialAssistantController.Fact>> facts = ArgumentCaptor.forClass(List.class);
        verify(explanations).explain(eq("Số dư thế nào?"), facts.capture());
        org.assertj.core.api.Assertions.assertThat(facts.getValue()).extracting(FinancialAssistantController.Fact::value)
                .contains("250.25").doesNotContain(accountId, OWNER, OTHER);
    }

    @Test
    void rejectsMissingAuthAndOversizedQuestion() throws Exception {
        mvc.perform(post("/api/v1/assistant/ask").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"Xin chào\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/assistant/ask").with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"question\":\" \"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/assistant/ask").with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(new FinancialAssistantController.Question("a".repeat(501)))))
                .andExpect(status().isBadRequest());
    }
}

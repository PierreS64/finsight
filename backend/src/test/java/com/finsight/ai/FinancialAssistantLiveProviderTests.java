package com.finsight.ai;

import static org.hamcrest.Matchers.anyOf;
import static org.hamcrest.Matchers.is;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Assumptions;
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
class FinancialAssistantLiveProviderTests {
    private static final String SYNTHETIC_OWNER = "46464646-cccc-4ccc-8ccc-cccccccccccc";
    @Autowired MockMvc mvc;

    @Test
    void syntheticFactsReachLiveProviderWhenKeyIsPresent() throws Exception {
        String key = System.getenv("OPENAI_API_KEY");
        Assumptions.assumeTrue(key != null && !key.isBlank(), "Set OPENAI_API_KEY only for a live provider check");
        mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(SYNTHETIC_OWNER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Synthetic cash\",\"accountType\":\"CASH\",\"openingBalance\":\"100000\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/assistant/ask").with(jwt().jwt(token -> token.subject(SYNTHETIC_OWNER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"Giải thích số dư giả lập tháng này.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source", anyOf(is("AI_EXPLANATION"), is("VERIFIED_ONLY"))))
                .andExpect(jsonPath("$.verifiedFacts[3].value").value("100000.00"));
    }
}

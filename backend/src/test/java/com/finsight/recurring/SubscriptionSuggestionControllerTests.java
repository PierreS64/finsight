package com.finsight.recurring;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
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
class SubscriptionSuggestionControllerTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private static SubscriptionSuggestionController.Observation row(UUID account, UUID category,
                                                                     String note, String amount, LocalDate date) {
        return new SubscriptionSuggestionController.Observation(account, category, null, null, note,
                new BigDecimal(amount), date);
    }

    @Test
    void detectsOnlyStableMonthlyExpenses() {
        UUID account = UUID.randomUUID(), category = UUID.randomUUID();
        LocalDate now = LocalDate.of(2026, 10, 22);
        var stable = List.of(row(account, category, "Cloud plan", "100.00", now.minusMonths(2)),
                row(account, category, " cloud   plan ", "101.00", now.minusMonths(1)),
                row(account, category, "Cloud plan", "99.00", now));
        var result = SubscriptionSuggestionController.detect(stable, now);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).estimatedAmount()).isEqualTo("100.00");
        assertThat(result.get(0).nextExpectedOn()).isEqualTo(now.plusMonths(1));
        assertThat(SubscriptionSuggestionController.detect(stable.subList(0, 2), now)).isEmpty();
        assertThat(SubscriptionSuggestionController.detect(List.of(stable.get(0), stable.get(1),
                row(account, category, "Cloud plan", "120.00", now)), now)).isEmpty();
        assertThat(SubscriptionSuggestionController.detect(List.of(stable.get(0), stable.get(1),
                row(account, category, "Cloud plan", "100.00", now.minusDays(10))), now)).isEmpty();
    }

    @Test
    void endpointScopesSuggestionsToOwnerAndRequiresAuth() throws Exception {
        String owner = "45454545-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
        String other = "45454545-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
        String accountJson = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Subscription wallet\",\"accountType\":\"CASH\",\"openingBalance\":\"1000\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String categoryJson = mvc.perform(post("/api/v1/categories").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Subscriptions\",\"categoryType\":\"EXPENSE\",\"icon\":\"other\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String account = json.readTree(accountJson).get("id").asText();
        String category = json.readTree(categoryJson).get("id").asText();
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Bangkok"));
        for (int i = 2; i >= 0; i--) {
            mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(owner)))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"accountId\":\"" + account + "\",\"categoryId\":\"" + category
                                    + "\",\"kind\":\"EXPENSE\",\"amount\":\"50.00\",\"occurredOn\":\""
                                    + today.minusMonths(i) + "\",\"note\":\"Stream plan\"}"))
                    .andExpect(status().isCreated());
        }
        mvc.perform(get("/api/v1/subscription-suggestions").with(jwt().jwt(token -> token.subject(owner))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].label").value("Stream plan"));
        mvc.perform(get("/api/v1/subscription-suggestions").with(jwt().jwt(token -> token.subject(other))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        mvc.perform(get("/api/v1/subscription-suggestions")).andExpect(status().isUnauthorized());
    }
}

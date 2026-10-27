package com.finsight.category;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
class CategorySuggestionControllerTests {
    private static final String ALICE = "47474747-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    private static final String BOB = "47474747-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    private static final String FOOD = "00000000-0000-4000-8000-000000000201";
    private static final String TRAVEL = "00000000-0000-4000-8000-000000000202";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String account(String owner) throws Exception {
        String body = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Gợi ý\",\"accountType\":\"CASH\",\"openingBalance\":\"1000\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asText();
    }

    private String merchant(String owner) throws Exception {
        String body = mvc.perform(post("/api/v1/merchants").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Quán nhỏ\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asText();
    }

    private void transaction(String owner, String account, String category, String merchant, String note) throws Exception {
        var request = new java.util.HashMap<String, Object>();
        request.put("accountId", account);
        request.put("categoryId", category);
        if (merchant != null) request.put("merchantId", merchant);
        request.put("kind", "EXPENSE");
        request.put("amount", "25.00");
        request.put("occurredOn", "2026-10-20");
        request.put("note", note);
        mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    @Test
    void matchesOnlyOwnHistoryAndNeverSavesSuggestion() throws Exception {
        String aliceAccount = account(ALICE);
        String bobAccount = account(BOB);
        transaction(ALICE, aliceAccount, FOOD, null, "  Cà phê   sáng ");
        transaction(ALICE, aliceAccount, FOOD, null, "CÀ PHÊ SÁNG");
        transaction(BOB, bobAccount, TRAVEL, null, "cà phê sáng");
        mvc.perform(get("/api/v1/categories/suggestion").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("kind", "EXPENSE").param("note", "cà phê sáng"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.categoryId").value(FOOD))
                .andExpect(jsonPath("$.source").value("NOTE"))
                .andExpect(jsonPath("$.supportingCount").value(2))
                .andExpect(jsonPath("$.totalMatches").value(2));
        mvc.perform(get("/api/v1/categories/suggestion").with(jwt().jwt(token -> token.subject(BOB)))
                        .param("kind", "EXPENSE").param("note", "cà phê sáng"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/transactions").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void merchantWinsOverNoteAndAmbiguousEvidenceGivesNoSuggestion() throws Exception {
        String account = account(ALICE);
        String merchant = merchant(ALICE);
        transaction(ALICE, account, FOOD, merchant, "Sáng");
        transaction(ALICE, account, FOOD, merchant, "Trưa");
        mvc.perform(get("/api/v1/categories/suggestion").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("kind", "EXPENSE").param("merchantId", merchant).param("note", "Khác"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.categoryId").value(FOOD))
                .andExpect(jsonPath("$.source").value("MERCHANT"));
        transaction(ALICE, account, TRAVEL, null, "Taxi");
        transaction(ALICE, account, FOOD, null, "Taxi");
        mvc.perform(get("/api/v1/categories/suggestion").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("kind", "EXPENSE").param("note", "taxi"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/categories/suggestion").param("kind", "EXPENSE").param("note", "taxi"))
                .andExpect(status().isUnauthorized());
    }
}

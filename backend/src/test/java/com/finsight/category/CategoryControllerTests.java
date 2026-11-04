package com.finsight.category;

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
class CategoryControllerTests {
    private static final String ALICE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    private static final String BOB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void defaultsAndPersonalCategoriesAreScopedAndEditableOnlyByTheirOwner() throws Exception {
        mvc.perform(get("/api/v1/categories").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].isDefault").value(true))
                .andExpect(jsonPath("$[0].name").exists());

        String created = mvc.perform(post("/api/v1/categories").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Cà phê\",\"categoryType\":\"EXPENSE\",\"icon\":\"food\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.isDefault").value(false))
                .andReturn().getResponse().getContentAsString();
        String id = json.readTree(created).get("id").asText();

        mvc.perform(post("/api/v1/categories").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Cà phê\",\"categoryType\":\"EXPENSE\",\"icon\":\"food\"}"))
                .andExpect(status().isConflict());

        mvc.perform(get("/api/v1/categories").with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == 'Cà phê')]").isEmpty());
        mvc.perform(put("/api/v1/categories/{id}", id).with(jwt().jwt(token -> token.subject(BOB)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Changed\",\"categoryType\":\"EXPENSE\",\"icon\":\"food\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/categories/{id}", id).with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/categories/{id}", id).with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Ăn ngoài\",\"categoryType\":\"EXPENSE\",\"icon\":\"food\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Ăn ngoài"));
        mvc.perform(delete("/api/v1/categories/{id}", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
    }

    @Test
    void defaultsDuplicatesAndInvalidInputAreRejected() throws Exception {
        String defaultId = "00000000-0000-4000-8000-000000000201";
        mvc.perform(delete("/api/v1/categories/{id}", defaultId).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/categories/{id}", defaultId).with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Changed\",\"categoryType\":\"EXPENSE\",\"icon\":\"food\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/categories").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"ăn uống\",\"categoryType\":\"EXPENSE\",\"icon\":\"food\"}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/v1/categories").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\" \",\"categoryType\":\"EXPENSE\",\"icon\":\"food\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/categories").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test\",\"categoryType\":\"TRANSFER\",\"icon\":\"food\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/categories").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test\",\"categoryType\":\"EXPENSE\",\"icon\":\"unknown\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/categories")).andExpect(status().isUnauthorized());
    }

    @Test
    void referencedCategoryCannotBeDeletedUntilTransactionsAndBudgetsAreRemoved() throws Exception {
        String categoryBody = mvc.perform(post("/api/v1/categories").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Referenced category\",\"categoryType\":\"EXPENSE\",\"icon\":\"food\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String categoryId = json.readTree(categoryBody).get("id").asText();
        String accountBody = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Reference test cash\",\"accountType\":\"CASH\",\"openingBalance\":\"100\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String accountId = json.readTree(accountBody).get("id").asText();
        String transactionBody = mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accountId\":\"" + accountId + "\",\"categoryId\":\"" + categoryId
                                + "\",\"kind\":\"EXPENSE\",\"amount\":\"1\",\"occurredOn\":\"2026-11-04\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String transactionId = json.readTree(transactionBody).get("id").asText();
        mvc.perform(delete("/api/v1/categories/{id}", categoryId).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/v1/transactions/{id}", transactionId).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk());

        mvc.perform(delete("/api/v1/transactions/{id}", transactionId)
                        .with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
        mvc.perform(put("/api/v1/budgets/categories/2026-11/{id}", categoryId)
                        .with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"limitAmount\":\"10\"}"))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/v1/categories/{id}", categoryId).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/v1/budgets").param("month", "2026-11")
                        .with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.categories[0].categoryId").value(categoryId));
        mvc.perform(delete("/api/v1/budgets/categories/2026-11/{id}", categoryId)
                        .with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
        mvc.perform(delete("/api/v1/categories/{id}", categoryId).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
    }
}

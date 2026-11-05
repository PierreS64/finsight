package com.finsight.merchant;

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
class MerchantControllerTests {
    private static final String ALICE = "c7c7c7c7-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    private static final String BOB = "d7d7d7d7-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    private static final String FOOD = "00000000-0000-4000-8000-000000000201";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String createMerchant(String owner, String name) throws Exception {
        String body = mvc.perform(post("/api/v1/merchants").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(new MerchantController.MerchantRequest(name))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asText();
    }

    private String createAccount() throws Exception {
        String body = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Merchant test\",\"accountType\":\"CASH\",\"openingBalance\":\"100.00\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asText();
    }

    private String transaction(String account, String merchant) {
        return "{\"accountId\":\"" + account + "\",\"categoryId\":\"" + FOOD + "\",\"merchantId\":\"" + merchant
                + "\",\"kind\":\"EXPENSE\",\"amount\":\"12.25\",\"occurredOn\":\"2026-10-22\"}";
    }

    @Test
    void ownerScopedCrudAndCaseInsensitiveUniqueName() throws Exception {
        String alice = createMerchant(ALICE, " Cửa hàng An ");
        createMerchant(BOB, "Cửa hàng An");
        mvc.perform(post("/api/v1/merchants").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"cửa hàng an\"}"))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/v1/merchants").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("Cửa hàng An"))
                .andExpect(jsonPath("$[1]").doesNotExist());
        mvc.perform(put("/api/v1/merchants/{id}", alice).with(jwt().jwt(token -> token.subject(BOB)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Đổi tên\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/merchants/{id}", alice).with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/merchants/{id}", alice).with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Siêu thị An\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Siêu thị An"));
        mvc.perform(get("/api/v1/merchants")).andExpect(status().isUnauthorized());
    }

    @Test
    void transactionReferenceIsOwnerScopedAndBlocksMerchantDeletion() throws Exception {
        String aliceMerchant = createMerchant(ALICE, "Mercado Alice");
        String bobMerchant = createMerchant(BOB, "Mercado Bob");
        String account = createAccount();
        mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(transaction(account, bobMerchant)))
                .andExpect(status().isNotFound());
        String created = mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(transaction(account, aliceMerchant)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.merchantId").value(aliceMerchant))
                .andReturn().getResponse().getContentAsString();
        String id = json.readTree(created).get("id").asText();
        mvc.perform(get("/api/v1/transactions/history?search=mercado").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(delete("/api/v1/merchants/{id}", aliceMerchant).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/v1/accounts").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].currentBalance").value("87.75"));
        mvc.perform(delete("/api/v1/transactions/{id}", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
        mvc.perform(delete("/api/v1/merchants/{id}", aliceMerchant).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
    }
}

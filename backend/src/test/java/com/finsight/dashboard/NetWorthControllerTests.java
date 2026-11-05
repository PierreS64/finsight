package com.finsight.dashboard;

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
class NetWorthControllerTests {
    private static final String OWNER = "43434343-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    private static final String OTHER = "43434343-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void calculatesExactAssetsLiabilitiesAndEnforcesOwnership() throws Exception {
        mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Ví\",\"accountType\":\"CASH\",\"openingBalance\":\"10.25\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Thấu chi\",\"accountType\":\"BANK\",\"openingBalance\":\"-3.50\"}"))
                .andExpect(status().isCreated());
        String asset = mvc.perform(post("/api/v1/net-worth/items").with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Xe đạp\",\"kind\":\"ASSET\",\"amount\":\"100.25\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = json.readTree(asset).get("id").asText();
        mvc.perform(post("/api/v1/net-worth/items").with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Khoản vay\",\"kind\":\"LIABILITY\",\"amount\":\"20.10\"}"))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/v1/net-worth").with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accountAssets").value("10.25"))
                .andExpect(jsonPath("$.accountLiabilities").value("3.50"))
                .andExpect(jsonPath("$.totalAssets").value("110.50"))
                .andExpect(jsonPath("$.totalLiabilities").value("23.60"))
                .andExpect(jsonPath("$.netWorth").value("86.90"))
                .andExpect(jsonPath("$.items.length()").value(2));
        mvc.perform(get("/api/v1/net-worth").with(jwt().jwt(token -> token.subject(OTHER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.netWorth").value("0"));
        mvc.perform(put("/api/v1/net-worth/items/{id}", id).with(jwt().jwt(token -> token.subject(OTHER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"X\",\"kind\":\"ASSET\",\"amount\":\"1\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/net-worth/items/{id}", id).with(jwt().jwt(token -> token.subject(OTHER))))
                .andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/net-worth/items/{id}", id).with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Xe đạp\",\"kind\":\"ASSET\",\"amount\":\"50.25\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.amount").value("50.25"));
        mvc.perform(get("/api/v1/net-worth").with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.netWorth").value("36.90"));
        mvc.perform(delete("/api/v1/net-worth/items/{id}", id).with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isNoContent());
    }

    @Test
    void rejectsInvalidItemsAndRequiresAuthentication() throws Exception {
        mvc.perform(post("/api/v1/net-worth/items").with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Nợ\",\"kind\":\"LIABILITY\",\"amount\":\"-1\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/net-worth/items").with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Nợ\",\"kind\":\"LIABILITY\",\"amount\":\"0.001\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/net-worth")).andExpect(status().isUnauthorized());
    }

    @Test
    void transferBetweenOwnedAccountsPreservesNetWorth() throws Exception {
        String owner = "43434343-cccc-4ccc-8ccc-cccccccccccc";
        String first = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Nguồn\",\"accountType\":\"CASH\",\"openingBalance\":\"100.00\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String second = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Đích\",\"accountType\":\"BANK\",\"openingBalance\":\"0.00\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String from = json.readTree(first).get("id").asText();
        String to = json.readTree(second).get("id").asText();
        mvc.perform(post("/api/v1/transfers").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fromAccountId\":\"" + from + "\",\"toAccountId\":\"" + to
                                + "\",\"amount\":\"30.25\",\"occurredOn\":\"2026-10-22\"}"))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/v1/net-worth").with(jwt().jwt(token -> token.subject(owner))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalAssets").value("100.00"))
                .andExpect(jsonPath("$.totalLiabilities").value("0"))
                .andExpect(jsonPath("$.netWorth").value("100.00"));
    }
}

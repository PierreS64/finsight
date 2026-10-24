package com.finsight.transaction;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class ReceiptOcrControllerTests {
    private static final String ALICE = "a4a4a4a4-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    private static final String BOB = "b4b4b4b4-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    private static final String FOOD = "00000000-0000-4000-8000-000000000201";
    private static final byte[] PNG = {(byte) 137, 80, 78, 71, 13, 10, 26, 10, 1};
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockitoBean ReceiptOcrEngine engine;

    private MockMultipartFile image() { return new MockMultipartFile("file", "receipt.png", "image/png", PNG); }

    @Test
    void recognitionOnlyPrefillsAndNeverCreatesTransaction() throws Exception {
        when(engine.recognize(any(), eq(".png"))).thenReturn("Cửa hàng B\nNgày 21/10/2026\nTổng cộng 100.000đ");
        mvc.perform(multipart("/api/v1/receipts/recognize").file(image())
                        .with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.merchant").value("Cửa hàng B"))
                .andExpect(jsonPath("$.occurredOn").value("2026-10-21"))
                .andExpect(jsonPath("$.amount").value("100000"))
                .andExpect(jsonPath("$.duplicateTransactionId").isEmpty());
        mvc.perform(get("/api/v1/transactions").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
        mvc.perform(multipart("/api/v1/receipts/recognize").file(image()))
                .andExpect(status().isUnauthorized());
        mvc.perform(multipart("/api/v1/receipts/recognize")
                        .file(new MockMultipartFile("file", "bad.png", "image/png", new byte[] {1, 2, 3}))
                        .with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void exactDuplicateIsVisibleOnlyToItsOwner() throws Exception {
        when(engine.recognize(any(), eq(".png"))).thenReturn("Cửa hàng B\nTổng cộng 100.000đ");
        String accountBody = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(BOB)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"OCR Bob\",\"accountType\":\"CASH\",\"openingBalance\":\"200000\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String account = json.readTree(accountBody).get("id").asText();
        String transactionBody = mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(BOB)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accountId\":\"" + account + "\",\"categoryId\":\"" + FOOD
                                + "\",\"kind\":\"EXPENSE\",\"amount\":\"100000\",\"occurredOn\":\"2026-10-21\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = json.readTree(transactionBody).get("id").asText();
        mvc.perform(multipart("/api/v1/transactions/{id}/receipt", id).file(image())
                        .with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isNoContent());
        mvc.perform(multipart("/api/v1/receipts/recognize").file(image())
                        .with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.duplicateTransactionId").isEmpty());
        mvc.perform(multipart("/api/v1/receipts/recognize").file(image())
                        .with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.duplicateTransactionId").value(id));
    }
}

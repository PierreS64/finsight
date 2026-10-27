package com.finsight.transaction;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class FinancialTransactionControllerTests {
    private static final String ALICE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    private static final String BOB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    private static final String FOOD = "00000000-0000-4000-8000-000000000201";
    private static final String SALARY = "00000000-0000-4000-8000-000000000101";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String account(String owner, String name) throws Exception {
        String body = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"accountType\":\"CASH\",\"openingBalance\":\"100000.00\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asText();
    }

    private static String body(String account, String category, String kind, String amount) {
        return "{\"accountId\":\"" + account + "\",\"categoryId\":\"" + category + "\",\"kind\":\"" + kind
                + "\",\"amount\":\"" + amount + "\",\"occurredOn\":\"2026-10-21\",\"note\":\"Thử nghiệm\"}";
    }

    @Test
    void crudUpdatesExactAccountBalanceAndRejectsOtherOwners() throws Exception {
        String aliceAccount = account(ALICE, "Transaction Alice");
        String bobAccount = account(BOB, "Transaction Bob");
        String created = mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(aliceAccount, FOOD, "EXPENSE", "12500.25")))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.amount").value("12500.25"))
                .andReturn().getResponse().getContentAsString();
        String id = json.readTree(created).get("id").asText();
        mvc.perform(get("/api/v1/accounts").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + aliceAccount + "')].currentBalance").value(hasItem("87499.75")));
        mvc.perform(get("/api/v1/transactions/{id}", id).with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/transactions/{id}", id).with(jwt().jwt(token -> token.subject(BOB)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(bobAccount, SALARY, "INCOME", "1")))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/transactions/{id}", id).with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/transactions").with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());

        mvc.perform(put("/api/v1/transactions/{id}", id).with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(aliceAccount, SALARY, "INCOME", "25000.50")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.kind").value("INCOME"));
        mvc.perform(get("/api/v1/accounts").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + aliceAccount + "')].currentBalance").value(hasItem("125000.50")));
        mvc.perform(delete("/api/v1/transactions/{id}", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/accounts").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + aliceAccount + "')].currentBalance").value(hasItem("100000.00")));
    }

    @Test
    void categoryAndAccountReferencesAndMoneyAreValidated() throws Exception {
        String aliceAccount = account(ALICE, "Validation Alice");
        String bobAccount = account(BOB, "Validation Bob");
        mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(bobAccount, FOOD, "EXPENSE", "10")))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(aliceAccount, SALARY, "EXPENSE", "10")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(aliceAccount, FOOD, "EXPENSE", "0")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(aliceAccount, FOOD, "EXPENSE", "1.001")))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/transactions")).andExpect(status().isUnauthorized());
    }

    @Test
    void referencedCategoryCannotBeDeletedUntilTransactionIsRemoved() throws Exception {
        String aliceAccount = account(ALICE, "Category reference");
        String category = mvc.perform(post("/api/v1/categories").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Giao dịch tham chiếu\",\"categoryType\":\"EXPENSE\",\"icon\":\"food\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String categoryId = json.readTree(category).get("id").asText();
        String transaction = mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(aliceAccount, categoryId, "EXPENSE", "10")))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = json.readTree(transaction).get("id").asText();
        mvc.perform(put("/api/v1/categories/{id}", categoryId).with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Giao dịch tham chiếu\",\"categoryType\":\"INCOME\",\"icon\":\"food\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(delete("/api/v1/categories/{id}", categoryId).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isConflict());
        mvc.perform(delete("/api/v1/transactions/{id}", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
        mvc.perform(delete("/api/v1/categories/{id}", categoryId).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
    }

    @Test
    void receiptIsPrivateReplaceableAndDeletedWithTransaction() throws Exception {
        String account = account(ALICE, "Receipt Alice");
        String created = mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(account, FOOD, "EXPENSE", "12")))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.hasReceipt").value(false))
                .andReturn().getResponse().getContentAsString();
        String id = json.readTree(created).get("id").asText();
        byte[] png = new byte[] {(byte) 137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3};
        mvc.perform(multipart("/api/v1/transactions/{id}/receipt", id)
                        .file(new MockMultipartFile("file", "receipt.png", "image/png", png))
                        .with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isNotFound());
        mvc.perform(multipart("/api/v1/transactions/{id}/receipt", id)
                        .file(new MockMultipartFile("file", "receipt.png", "image/png", png))
                        .with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/transactions/{id}", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(jsonPath("$.hasReceipt").value(true));
        mvc.perform(get("/api/v1/transactions").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(jsonPath("$[?(@.id == '" + id + "')].hasReceipt").value(hasItem(true)));
        mvc.perform(get("/api/v1/transactions/{id}/receipt", id).with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/transactions/{id}/receipt", id))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/transactions/{id}/receipt", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(result -> org.junit.jupiter.api.Assertions.assertArrayEquals(
                        png, result.getResponse().getContentAsByteArray()));
        byte[] jpeg = new byte[] {(byte) 255, (byte) 216, (byte) 255, 1, 2, 3};
        mvc.perform(multipart("/api/v1/transactions/{id}/receipt", id)
                        .file(new MockMultipartFile("file", "replacement.jpg", "image/jpeg", jpeg))
                        .with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/transactions/{id}/receipt", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(result -> org.junit.jupiter.api.Assertions.assertArrayEquals(
                        jpeg, result.getResponse().getContentAsByteArray()));
        mvc.perform(multipart("/api/v1/transactions/{id}/receipt", id)
                        .file(new MockMultipartFile("file", "fake.png", "image/png", new byte[] {1, 2, 3}))
                        .with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/transactions/{id}/receipt", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(result -> org.junit.jupiter.api.Assertions.assertArrayEquals(
                        jpeg, result.getResponse().getContentAsByteArray()));
        mvc.perform(delete("/api/v1/transactions/{id}/receipt", id).with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/transactions/{id}/receipt", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/transactions/{id}/receipt", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNotFound());
        mvc.perform(multipart("/api/v1/transactions/{id}/receipt", id)
                        .file(new MockMultipartFile("file", "receipt.png", "image/png", png))
                        .with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
        mvc.perform(delete("/api/v1/transactions/{id}", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/transactions/{id}/receipt", id).with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isNotFound());
    }

    @Test
    void historyCombinesFiltersKeepsPageOrderAndExcludesOtherOwners() throws Exception {
        String aliceAccount = account(ALICE, "History Alice");
        String bobAccount = account(BOB, "History Bob");
        for (String date : new String[] {"2026-02-28", "2026-03-01", "2026-03-01", "2026-03-31", "2026-04-01"}) {
            mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(ALICE)))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body(aliceAccount, FOOD, "EXPENSE", "10").replace("2026-10-21", date)
                            .replace("Thử nghiệm", date.equals("2026-03-31") ? "Coffee" : "Khác")))
                    .andExpect(status().isCreated());
        }
        mvc.perform(post("/api/v1/transactions").with(jwt().jwt(token -> token.subject(BOB)))
                        .contentType(MediaType.APPLICATION_JSON).content(body(bobAccount, FOOD, "EXPENSE", "99")))
                .andExpect(status().isCreated());
        String firstPage = mvc.perform(get("/api/v1/transactions/history")
                        .with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2026-03").param("kind", "EXPENSE").param("categoryId", FOOD)
                        .param("size", "2").param("sort", "asc"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].occurredOn").value("2026-03-01"))
                .andReturn().getResponse().getContentAsString();
        String secondPage = mvc.perform(get("/api/v1/transactions/history")
                        .with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("month", "2026-03").param("kind", "EXPENSE").param("categoryId", FOOD)
                        .param("size", "2").param("page", "1").param("sort", "asc"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].occurredOn").value("2026-03-31"))
                .andReturn().getResponse().getContentAsString();
        var firstItems = json.readTree(firstPage).get("items");
        var lastId = json.readTree(secondPage).get("items").get(0).get("id").asText();
        org.junit.jupiter.api.Assertions.assertNotEquals(firstItems.get(0).get("id").asText(), firstItems.get(1).get("id").asText());
        org.junit.jupiter.api.Assertions.assertNotEquals(firstItems.get(0).get("id").asText(), lastId);
        org.junit.jupiter.api.Assertions.assertNotEquals(firstItems.get(1).get("id").asText(), lastId);
        mvc.perform(get("/api/v1/transactions/history").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("search", "coffee").param("from", "2026-03-31").param("to", "2026-03-31"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/v1/transactions/history").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("search", "history alice"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(5));
        mvc.perform(get("/api/v1/transactions/history").with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/api/v1/transactions/history").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("page", "2").param("size", "2").param("month", "2026-03"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        mvc.perform(get("/api/v1/transactions/history").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("from", "2026-04-01").param("to", "2026-03-01"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/transactions/history").with(jwt().jwt(token -> token.subject(ALICE)))
                        .param("size", "51"))
                .andExpect(status().isBadRequest());
    }
}

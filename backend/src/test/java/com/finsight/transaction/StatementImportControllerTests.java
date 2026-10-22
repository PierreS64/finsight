package com.finsight.transaction;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
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
class StatementImportControllerTests {
    private static final String ALICE = "e8e8e8e8-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    private static final String BOB = "f8f8f8f8-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    private static final String FOOD = "00000000-0000-4000-8000-000000000201";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String account(String owner) throws Exception {
        String body = mvc.perform(post("/api/v1/accounts").with(jwt().jwt(token -> token.subject(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Statement test\",\"accountType\":\"CASH\",\"openingBalance\":\"100.00\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asText();
    }

    private MockMultipartFile file() {
        return new MockMultipartFile("file", "test.csv", "text/csv",
                "date,description,amount,type\n2026-10-22,Siêu thị A,12.25,expense\n2026-10-23,Siêu thị B,5,expense\n"
                        .getBytes(StandardCharsets.UTF_8));
    }

    private String batch(String account, String hash, String rows) {
        return "{\"accountId\":\"" + account + "\",\"sourceHash\":\"" + hash + "\",\"rows\":[" + rows + "]}";
    }

    private String row(int number, String description, String amount) {
        return "{\"rowNumber\":" + number + ",\"categoryId\":\"" + FOOD
                + "\",\"kind\":\"EXPENSE\",\"amount\":\"" + amount
                + "\",\"occurredOn\":\"2026-10-" + (number == 2 ? "22" : "23")
                + "\",\"description\":\"" + description + "\"}";
    }

    @Test
    void previewsThenImportsOnceAndKeepsBatchAtomic() throws Exception {
        String account = account(ALICE);
        String preview = mvc.perform(multipart("/api/v1/statements/preview").file(file()).param("accountId", account)
                        .with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.rows.length()").value(2))
                .andExpect(jsonPath("$.rows[0].amount").value("12.25"))
                .andReturn().getResponse().getContentAsString();
        String hash = json.readTree(preview).get("sourceHash").asText();
        mvc.perform(multipart("/api/v1/statements/preview").file(file()).param("accountId", account)
                        .with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/statements/import").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(batch(account, hash, row(2, "Siêu thị A", "12.25"))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.importedCount").value(1));
        mvc.perform(post("/api/v1/statements/import").with(jwt().jwt(token -> token.subject(ALICE)))
                        .contentType(MediaType.APPLICATION_JSON).content(batch(account, hash, row(3, "Siêu thị B", "5") + "," + row(2, "Siêu thị A", "12.25"))))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/v1/transactions").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(multipart("/api/v1/statements/preview").file(file()).param("accountId", account)
                        .with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.rows[0].alreadyImported").value(true))
                .andExpect(jsonPath("$.rows[1].alreadyImported").value(false));
        mvc.perform(get("/api/v1/accounts").with(jwt().jwt(token -> token.subject(ALICE))))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].currentBalance").value("87.75"));
        mvc.perform(post("/api/v1/statements/import").contentType(MediaType.APPLICATION_JSON)
                        .content(batch(account, hash, row(3, "Siêu thị B", "5"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void previewFlagsRepeatedRowsWithinOneFile() throws Exception {
        String account = account(BOB);
        var repeated = new MockMultipartFile("file", "repeated.csv", "text/csv",
                "date,description,amount,type\n2026-10-22,Same,12.50,expense\n2026-10-22,Same,12.50,expense\n"
                        .getBytes(StandardCharsets.UTF_8));
        mvc.perform(multipart("/api/v1/statements/preview").file(repeated).param("accountId", account)
                        .with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.rows[0].possibleDuplicate").value(false))
                .andExpect(jsonPath("$.rows[1].possibleDuplicate").value(true));
        var invalid = new MockMultipartFile("file", "bad.csv", "text/csv",
                "date,description,amount,type\n2026-10-22,Invalid,1.0001,expense\n".getBytes(StandardCharsets.UTF_8));
        mvc.perform(multipart("/api/v1/statements/preview").file(invalid).param("accountId", account)
                        .with(jwt().jwt(token -> token.subject(BOB))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail").value("Row 2: invalid positive amount"));
    }
}

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
class StatementFinanceJourneyTests {
    private static final String OWNER = "92929292-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    private static final String OTHER = "92929292-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    private static final String FOOD = "00000000-0000-4000-8000-000000000201";
    private static final String SALARY = "00000000-0000-4000-8000-000000000101";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private MockMultipartFile statement() {
        return new MockMultipartFile("file", "journey.csv", "text/csv",
                "date,description,amount,type\n2026-10-22,Groceries,12.25,expense\n2026-10-23,Salary,50.00,income\n"
                        .getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void reviewedStatementFlowsThroughReportsWithoutGoalsOrReconciliationChangingCash() throws Exception {
        String accountBody = mvc.perform(post("/api/v1/accounts")
                        .with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Journey cash\",\"accountType\":\"CASH\",\"openingBalance\":\"100.00\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String accountId = json.readTree(accountBody).get("id").asText();

        String previewBody = mvc.perform(multipart("/api/v1/statements/preview").file(statement())
                        .param("accountId", accountId).with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows.length()").value(2))
                .andExpect(jsonPath("$.rows[0].alreadyImported").value(false))
                .andExpect(jsonPath("$.rows[1].alreadyImported").value(false))
                .andReturn().getResponse().getContentAsString();
        String hash = json.readTree(previewBody).get("sourceHash").asText();
        String importBody = "{\"accountId\":\"" + accountId + "\",\"sourceHash\":\"" + hash + "\",\"rows\":["
                + "{\"rowNumber\":2,\"categoryId\":\"" + FOOD
                + "\",\"kind\":\"EXPENSE\",\"amount\":\"12.25\",\"occurredOn\":\"2026-10-22\",\"description\":\"Groceries\"},"
                + "{\"rowNumber\":3,\"categoryId\":\"" + SALARY
                + "\",\"kind\":\"INCOME\",\"amount\":\"50.00\",\"occurredOn\":\"2026-10-23\",\"description\":\"Salary\"}]}";
        mvc.perform(post("/api/v1/statements/import").with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON).content(importBody))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.importedCount").value(2));

        mvc.perform(get("/api/v1/dashboard").param("month", "2026-10")
                        .with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.transactionCount").value(2))
                .andExpect(jsonPath("$.income").value("50.00"))
                .andExpect(jsonPath("$.expense").value("12.25"))
                .andExpect(jsonPath("$.netFlow").value("37.75"))
                .andExpect(jsonPath("$.totalBalance").value("137.75"));
        mvc.perform(get("/api/v1/net-worth").with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.netWorth").value("137.75"));

        mvc.perform(post("/api/v1/goals").with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Journey goal\",\"targetAmount\":\"100\",\"savedAmount\":\"25\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/accounts/{id}/reconciliations", accountId)
                        .with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"observedBalance\":\"130.00\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.expectedBalance").value("137.75"))
                .andExpect(jsonPath("$.differenceAmount").value("-7.75"));
        mvc.perform(get("/api/v1/accounts").with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].currentBalance").value("137.75"));
        mvc.perform(get("/api/v1/net-worth").with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.netWorth").value("137.75"));

        mvc.perform(multipart("/api/v1/statements/preview").file(statement())
                        .param("accountId", accountId).with(jwt().jwt(token -> token.subject(OWNER))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].alreadyImported").value(true))
                .andExpect(jsonPath("$.rows[1].alreadyImported").value(true));
        mvc.perform(post("/api/v1/statements/import").with(jwt().jwt(token -> token.subject(OWNER)))
                        .contentType(MediaType.APPLICATION_JSON).content(importBody))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/v1/accounts").with(jwt().jwt(token -> token.subject(OTHER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
        mvc.perform(get("/api/v1/dashboard").param("month", "2026-10")
                        .with(jwt().jwt(token -> token.subject(OTHER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.transactionCount").value(0))
                .andExpect(jsonPath("$.totalBalance").value("0"));
    }
}

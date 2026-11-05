package com.finsight.insight;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.YearMonth;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class FinancialHealthControllerTests {
    @Autowired MockMvc mvc;

    @Test
    void scoresBoundariesAndShowsMissingData() {
        var empty = FinancialHealthController.calculate(YearMonth.of(2026, 10), BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO, null);
        assertThat(empty.score()).isNull();
        assertThat(empty.coveragePercent()).isZero();
        assertThat(empty.status()).isEqualTo("INSUFFICIENT_DATA");

        var strong = FinancialHealthController.calculate(YearMonth.of(2026, 10), new BigDecimal("1000.00"),
                new BigDecimal("800.00"), new BigDecimal("2400.00"), new BigDecimal("1000.00"));
        assertThat(strong.score()).isEqualTo("100.0");
        assertThat(strong.coveragePercent()).isEqualTo(100);
        assertThat(strong.components()).extracting(FinancialHealthController.Component::points)
                .containsExactly("40.0", "30.0", "30.0");

        var weak = FinancialHealthController.calculate(YearMonth.of(2026, 10), new BigDecimal("100.00"),
                new BigDecimal("120.00"), new BigDecimal("-1.00"), new BigDecimal("100.00"));
        assertThat(weak.score()).isEqualTo("0.0");
        assertThat(weak.status()).isEqualTo("COMPLETE");

        var partial = FinancialHealthController.calculate(YearMonth.of(2026, 10), new BigDecimal("100.00"),
                BigDecimal.ZERO, BigDecimal.ZERO, null);
        assertThat(partial.score()).isEqualTo("100.0");
        assertThat(partial.coveragePercent()).isEqualTo(40);
        assertThat(partial.status()).isEqualTo("PARTIAL");
    }

    @Test
    void endpointRequiresAuthAndScopesCurrentData() throws Exception {
        mvc.perform(get("/api/v1/financial-health")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/financial-health").with(jwt().jwt(token ->
                        token.subject("44444444-aaaa-4aaa-8aaa-aaaaaaaaaaaa"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.score").doesNotExist())
                .andExpect(jsonPath("$.status").value("INSUFFICIENT_DATA"));
    }
}

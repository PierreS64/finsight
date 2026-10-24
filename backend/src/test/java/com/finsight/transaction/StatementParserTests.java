package com.finsight.transaction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class StatementParserTests {
    @Test
    void parsesQuotedUtf8CsvAndExactVietnameseMoney() {
        byte[] bytes = "date,description,amount,type\n22/10/2026,\"Siêu thị, A\",\"12.345,67\",chi\n"
                .getBytes(StandardCharsets.UTF_8);
        var row = StatementParser.parse("statement.csv", bytes).rows().get(0);
        assertEquals(2, row.rowNumber());
        assertEquals("Siêu thị, A", row.description());
        assertEquals(new BigDecimal("12345.67"), row.amount());
        assertEquals(FinancialTransaction.Kind.EXPENSE, row.kind());
        var semicolon = StatementParser.parse("statement.csv",
                "date;description;amount;type\n2026-10-22;Shop;12,50;expense\n".getBytes(StandardCharsets.UTF_8));
        assertEquals(new BigDecimal("12.50"), semicolon.rows().get(0).amount());
    }

    @Test
    void parsesXlsxAndRejectsInvalidRows() throws Exception {
        byte[] bytes;
        try (var workbook = new XSSFWorkbook(); var output = new ByteArrayOutputStream()) {
            var sheet = workbook.createSheet();
            var header = sheet.createRow(0);
            String[] columns = {"date", "description", "amount", "type"};
            for (int i = 0; i < columns.length; i++) header.createCell(i).setCellValue(columns[i]);
            var row = sheet.createRow(1);
            row.createCell(0).setCellValue("2026-10-22");
            row.createCell(1).setCellValue("Lương");
            row.createCell(2).setCellValue(12500.25);
            row.createCell(3).setCellValue("income");
            workbook.write(output);
            bytes = output.toByteArray();
        }
        assertEquals(new BigDecimal("12500.25"), StatementParser.parse("bank.xlsx", bytes).rows().get(0).amount());
        assertThrows(ResponseStatusException.class, () -> StatementParser.parse("bank.xlsx", "not xlsx".getBytes(StandardCharsets.UTF_8)));
        assertThrows(ResponseStatusException.class, () -> StatementParser.parse("bank.csv",
                "date,description,amount,type\n2026-10-22,Test,1.0001,expense\n".getBytes(StandardCharsets.UTF_8)));
    }
}

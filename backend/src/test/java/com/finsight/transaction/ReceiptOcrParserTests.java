package com.finsight.transaction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import org.junit.jupiter.api.Test;

class ReceiptOcrParserTests {
    @Test
    void extractsMerchantDateAndExactVndTotal() {
        var result = ReceiptOcrParser.parse("Cửa hàng An Phú\nHÓA ĐƠN BÁN LẺ\nNgày: 21/10/2026\n"
                + "Bánh mì 25.000\nTỔNG THANH TOÁN: 125.000đ");
        assertEquals("Cửa hàng An Phú", result.merchant());
        assertEquals("2026-10-21", result.occurredOn().toString());
        assertEquals("125000", result.amount().toPlainString());
    }

    @Test
    void missingOrMalformedFieldsRemainEmptyForManualReview() {
        var result = ReceiptOcrParser.parse("Cửa hàng A\nNgày: 32/13/2026\nTỔNG CỘNG: 12.34.567đ");
        assertEquals("Cửa hàng A", result.merchant());
        assertNull(result.occurredOn());
        assertNull(result.amount());
    }
}

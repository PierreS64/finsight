package com.finsight.transaction;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

class TesseractReceiptOcrEngineTests {
    @Test
    void recognizesSyntheticReceiptWhenLocalEngineIsConfigured() throws Exception {
        String command = System.getenv("FINSIGHT_TESSERACT_COMMAND");
        String dataDirectory = System.getenv("FINSIGHT_TESSDATA_DIR");
        Assumptions.assumeTrue(command != null && Files.isRegularFile(Path.of(command)));
        BufferedImage image = new BufferedImage(900, 350, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setColor(Color.WHITE); graphics.fillRect(0, 0, 900, 350);
            graphics.setColor(Color.BLACK); graphics.setFont(new Font("Arial", Font.PLAIN, 32));
            graphics.drawString("FIN SIGHT SHOP", 40, 60);
            graphics.drawString("Date: 21/10/2026", 40, 150);
            graphics.drawString("TOTAL: 125,000 VND", 40, 240);
        } finally { graphics.dispose(); }
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(image, "png", bytes);
        String text = new TesseractReceiptOcrEngine(command, "eng", dataDirectory == null ? "" : dataDirectory)
                .recognize(bytes.toByteArray(), ".png");
        var parsed = ReceiptOcrParser.parse(text);
        assertTrue(parsed.merchant().contains("FIN SIGHT SHOP"));
        assertTrue(parsed.amount().toPlainString().equals("125000"));
    }
}

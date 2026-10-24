package com.finsight.transaction;

import java.io.IOException;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/receipts")
public class ReceiptOcrController {
    private final ReceiptOcrEngine engine;
    private final TransactionReceiptStore receipts;

    public ReceiptOcrController(ReceiptOcrEngine engine, TransactionReceiptStore receipts) {
        this.engine = engine;
        this.receipts = receipts;
    }

    @PostMapping(value = "/recognize", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Recognition recognize(@AuthenticationPrincipal Jwt jwt, @RequestPart("file") MultipartFile file) throws IOException {
        UUID owner;
        try { owner = UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
        if (file.isEmpty() || file.getSize() > 5_000_000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Receipt must be at most 5 MB");
        byte[] image = file.getBytes();
        String type = file.getContentType();
        if (!FinancialTransactionController.validImage(type, image))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Receipt must be a JPEG, PNG or WebP image");
        UUID duplicate = receipts.findExactDuplicate(owner, image).orElse(null);
        String extension = "image/jpeg".equals(type) ? ".jpg" : "image/png".equals(type) ? ".png" : ".webp";
        String raw;
        try { raw = engine.recognize(image, extension); }
        catch (IOException ex) { throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "OCR is unavailable; enter the transaction manually", ex); }
        ReceiptOcrParser.Result parsed = ReceiptOcrParser.parse(raw);
        return new Recognition(parsed.merchant(), parsed.occurredOn(),
                parsed.amount() == null ? null : parsed.amount().toPlainString(), duplicate,
                parsed.merchant() != null || parsed.occurredOn() != null || parsed.amount() != null);
    }

    public record Recognition(String merchant, LocalDate occurredOn, String amount,
                              UUID duplicateTransactionId, boolean readable) {}
}

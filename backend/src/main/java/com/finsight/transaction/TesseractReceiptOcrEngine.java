package com.finsight.transaction;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TesseractReceiptOcrEngine implements ReceiptOcrEngine {
    private final String command;
    private final String languages;
    private final String dataDirectory;

    public TesseractReceiptOcrEngine(
            @Value("${FINSIGHT_TESSERACT_COMMAND:tesseract}") String command,
            @Value("${FINSIGHT_OCR_LANGUAGES:eng}") String languages,
            @Value("${FINSIGHT_TESSDATA_DIR:}") String dataDirectory) {
        this.command = command;
        this.languages = languages;
        this.dataDirectory = dataDirectory;
    }

    @Override
    public String recognize(byte[] image, String extension) throws IOException {
        Path source = Files.createTempFile("finsight-ocr-", extension);
        Path output = Files.createTempFile("finsight-ocr-output-", ".txt");
        Path errors = Files.createTempFile("finsight-ocr-errors-", ".txt");
        try {
            Files.write(source, image);
            List<String> arguments = new ArrayList<>(List.of(command, source.toString(), "stdout", "-l", languages, "--psm", "6"));
            if (!dataDirectory.isBlank()) { arguments.add("--tessdata-dir"); arguments.add(dataDirectory); }
            Process process = new ProcessBuilder(arguments)
                    .redirectOutput(output.toFile()).redirectError(errors.toFile()).start();
            boolean finished;
            try { finished = process.waitFor(Duration.ofSeconds(20).toMillis(), TimeUnit.MILLISECONDS); }
            catch (InterruptedException ex) {
                process.destroyForcibly(); Thread.currentThread().interrupt();
                throw new IOException("OCR interrupted", ex);
            }
            if (!finished) { process.destroyForcibly(); throw new IOException("OCR timed out"); }
            if (process.exitValue() != 0) throw new IOException("OCR engine failed");
            if (Files.size(output) > 100_000) throw new IOException("OCR output is too large");
            return Files.readString(output, StandardCharsets.UTF_8);
        } finally {
            Files.deleteIfExists(source);
            Files.deleteIfExists(output);
            Files.deleteIfExists(errors);
        }
    }
}

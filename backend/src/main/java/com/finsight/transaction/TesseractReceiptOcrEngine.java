package com.finsight.transaction;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.FileSystems;
import java.nio.file.attribute.PosixFilePermissions;
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
        Path workDirectory = createPrivateWorkDirectory();
        Path source = null;
        Path output = null;
        Path errors = null;
        try {
            source = Files.createTempFile(workDirectory, "source-", extension);
            output = Files.createTempFile(workDirectory, "output-", ".txt");
            errors = Files.createTempFile(workDirectory, "errors-", ".txt");
            Files.write(source, image);
            String standard = run(source, output, errors, false);
            if (score(standard) == 3) return standard;
            try {
                String adaptive = run(source, output, errors, true);
                return score(adaptive) > score(standard) ? adaptive : standard;
            } catch (IOException ex) {
                if (Thread.currentThread().isInterrupted()) throw ex;
                // Older Tesseract installations may not support Sauvola; keep the first result.
                return standard;
            }
        } finally {
            if (source != null) Files.deleteIfExists(source);
            if (output != null) Files.deleteIfExists(output);
            if (errors != null) Files.deleteIfExists(errors);
            Files.deleteIfExists(workDirectory);
        }
    }

    private static Path createPrivateWorkDirectory() throws IOException {
        if (FileSystems.getDefault().supportedFileAttributeViews().contains("posix")) {
            return Files.createTempDirectory("finsight-ocr-",
                    PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rwx------")));
        }
        return Files.createTempDirectory("finsight-ocr-");
    }

    private String run(Path source, Path output, Path errors, boolean adaptive) throws IOException {
        List<String> arguments = new ArrayList<>(List.of(command, source.toString(), "stdout", "-l", languages, "--psm", "6"));
        if (!dataDirectory.isBlank()) { arguments.add("--tessdata-dir"); arguments.add(dataDirectory); }
        if (adaptive) { arguments.add("-c"); arguments.add("thresholding_method=2"); }
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
    }

    private static int score(String text) {
        ReceiptOcrParser.Result parsed = ReceiptOcrParser.parse(text);
        return (parsed.amount() == null ? 0 : 2) + (parsed.occurredOn() == null ? 0 : 1);
    }
}

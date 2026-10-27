package com.finsight.transaction;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.StringReader;
import java.math.BigDecimal;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.stream.IntStream;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

final class StatementParser {
    private static final int MAX_BYTES = 2_000_000;
    private static final int MAX_ROWS = 200;
    private StatementParser() {}

    static Preview parse(String fileName, byte[] bytes) {
        if (bytes.length == 0 || bytes.length > MAX_BYTES)
            throw bad("Statement must be 1 byte to 2 MB");
        String extension = fileName == null ? "" : fileName.toLowerCase(Locale.ROOT);
        List<RawRow> raw;
        try {
            if (extension.endsWith(".csv")) raw = csv(bytes);
            else if (extension.endsWith(".xlsx")) raw = xlsx(bytes);
            else throw bad("Statement must be a CSV or XLSX file");
        } catch (ResponseStatusException ex) { throw ex; }
        catch (Exception ex) { throw bad("Could not read statement file"); }
        if (raw.size() < 2) throw bad("Statement needs a header and at least one row");
        if (raw.size() - 1 > MAX_ROWS) throw bad("Statement may contain at most 200 rows");
        List<String> header = raw.get(0).values();
        int date = column(header, "date", "transaction date", "ngay", "ngày", "ngày giao dịch");
        int description = column(header, "description", "memo", "mô tả", "noi dung", "nội dung", "diễn giải");
        int amount = column(header, "amount", "so tien", "số tiền");
        int type = column(header, "type", "kind", "loai", "loại");
        if (date < 0 || description < 0 || amount < 0 || type < 0)
            throw bad("Required columns: date, description, amount, type");
        List<ParsedRow> rows = new ArrayList<>();
        for (RawRow row : raw.subList(1, raw.size())) {
            if (row.values().stream().allMatch(String::isBlank)) continue;
            String descriptionValue = value(row, description).trim();
            if (descriptionValue.isEmpty() || descriptionValue.length() > 500)
                throw bad("Row " + row.number() + ": description must have 1 to 500 characters");
            rows.add(new ParsedRow(row.number(), parseDate(value(row, date), row.number()), descriptionValue,
                    parseAmount(value(row, amount), row.number()), parseKind(value(row, type), row.number())));
        }
        if (rows.isEmpty()) throw bad("Statement has no transaction rows");
        return new Preview(sha256(bytes), rows);
    }

    private static List<RawRow> csv(byte[] bytes) throws IOException {
        String text;
        try {
            text = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
        } catch (CharacterCodingException ex) { throw bad("CSV must be UTF-8"); }
        if (text.startsWith("\uFEFF")) text = text.substring(1);
        String header = text.lines().findFirst().orElse("");
        char delimiter = header.contains(";") && !header.contains(",") ? ';' : ',';
        var parser = CSVFormat.DEFAULT.builder().setDelimiter(delimiter).setIgnoreSurroundingSpaces(true)
                .get().parse(new StringReader(text));
        List<RawRow> rows = new ArrayList<>();
        for (CSVRecord record : parser) {
            if (record.size() > 30) throw bad("Statement has too many columns");
            List<String> cells = IntStream.range(0, record.size()).mapToObj(record::get).toList();
            rows.add(new RawRow(Math.toIntExact(record.getRecordNumber()), cells));
            if (rows.size() > MAX_ROWS + 1) throw bad("Statement may contain at most 200 rows");
        }
        return rows;
    }

    private static List<RawRow> xlsx(byte[] bytes) throws IOException {
        if (bytes.length < 4 || bytes[0] != 'P' || bytes[1] != 'K') throw bad("XLSX content is invalid");
        List<RawRow> rows = new ArrayList<>();
        try (var workbook = WorkbookFactory.create(new ByteArrayInputStream(bytes))) {
            if (workbook.getNumberOfSheets() == 0) throw bad("XLSX has no sheet");
            var sheet = workbook.getSheetAt(0);
            if (sheet.getLastRowNum() > MAX_ROWS + 10) throw bad("Statement may contain at most 200 rows");
            DataFormatter formatter = new DataFormatter(Locale.ROOT);
            for (Row row : sheet) {
                int count = Math.max(0, row.getLastCellNum());
                if (count > 30) throw bad("Statement has too many columns");
                List<String> cells = new ArrayList<>();
                for (int i = 0; i < count; i++) {
                    Cell cell = row.getCell(i);
                    if (cell != null && cell.getCellType() == CellType.FORMULA)
                        throw bad("Row " + (row.getRowNum() + 1) + ": formulas are not supported");
                    if (cell != null && cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell))
                        cells.add(cell.getLocalDateTimeCellValue().toLocalDate().toString());
                    else cells.add(cell == null ? "" : formatter.formatCellValue(cell));
                }
                rows.add(new RawRow(row.getRowNum() + 1, cells));
                if (rows.size() > MAX_ROWS + 1) throw bad("Statement may contain at most 200 rows");
            }
        }
        return rows;
    }

    private static String value(RawRow row, int index) {
        if (index >= row.values().size()) throw bad("Row " + row.number() + ": missing value");
        return row.values().get(index);
    }

    private static int column(List<String> header, String... options) {
        for (int i = 0; i < header.size(); i++) {
            String normalized = header.get(i).trim().toLowerCase(Locale.ROOT);
            for (String option : options) if (normalized.equals(option)) return i;
        }
        return -1;
    }

    private static LocalDate parseDate(String raw, int row) {
        String value = raw.trim();
        try { return LocalDate.parse(value); }
        catch (DateTimeParseException ignored) {
            try { return LocalDate.parse(value, DateTimeFormatter.ofPattern("d/M/uuuu")); }
            catch (DateTimeParseException ex) { throw bad("Row " + row + ": invalid date"); }
        }
    }

    private static BigDecimal parseAmount(String raw, int row) {
        String value = raw.trim().replace(" ", "").replace("\u00a0", "");
        if (value.contains(",") && value.contains(".")) {
            value = value.lastIndexOf(',') > value.lastIndexOf('.')
                    ? value.replace(".", "").replace(',', '.') : value.replace(",", "");
        } else if (value.contains(",")) {
            value = value.matches("\\d{1,3}(,\\d{3})+") ? value.replace(",", "") : value.replace(',', '.');
        } else if (value.matches("\\d{1,3}(\\.\\d{3})+")) value = value.replace(".", "");
        if (!value.matches("\\d{1,17}(\\.\\d{1,2})?")) throw bad("Row " + row + ": invalid positive amount");
        BigDecimal amount = new BigDecimal(value);
        if (amount.signum() <= 0) throw bad("Row " + row + ": amount must be positive");
        return amount;
    }

    private static FinancialTransaction.Kind parseKind(String raw, int row) {
        return switch (raw.trim().toLowerCase(Locale.ROOT)) {
            case "income", "thu", "thu nhập", "credit" -> FinancialTransaction.Kind.INCOME;
            case "expense", "chi", "chi tiêu", "debit" -> FinancialTransaction.Kind.EXPENSE;
            default -> throw bad("Row " + row + ": type must be income/expense");
        };
    }

    private static String sha256(byte[] bytes) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private record RawRow(int number, List<String> values) {}
    record ParsedRow(int rowNumber, LocalDate occurredOn, String description, BigDecimal amount, FinancialTransaction.Kind kind) {}
    record Preview(String sourceHash, List<ParsedRow> rows) {}
}

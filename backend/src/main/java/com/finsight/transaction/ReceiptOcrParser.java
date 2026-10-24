package com.finsight.transaction;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class ReceiptOcrParser {
    private static final Pattern DATE = Pattern.compile("(?<!\\d)(\\d{1,4})[./-](\\d{1,2})[./-](\\d{1,4})(?!\\d)");
    private static final Pattern MONEY = Pattern.compile("(?<![\\d.,])(?:\\d{1,3}(?:[., ]\\d{3})+|\\d{4,17})(?![\\d.,])");
    private static final Pattern TOTAL = Pattern.compile(".*\\b(TONG|TOTAL|THANH TOAN|PHAI TRA|AMOUNT DUE)\\b.*");

    private ReceiptOcrParser() {}

    public static Result parse(String text) {
        List<String> lines = text.lines().map(String::trim).filter(line -> !line.isBlank()).toList();
        String merchant = null;
        LocalDate date = null;
        BigDecimal amount = null;
        for (String line : lines) {
            String label = ascii(line).toUpperCase();
            if (merchant == null && line.length() <= 120 && !TOTAL.matcher(label).matches()
                    && !label.matches(".*\\b(HOA DON|INVOICE|RECEIPT|NGAY|DATE|MA SO THUE|MST)\\b.*")
                    && line.matches(".*\\p{L}.*")) merchant = line;
            if (date == null) date = parseDate(line);
            if (TOTAL.matcher(label).matches()) {
                BigDecimal candidate = parseAmount(line);
                if (candidate != null) amount = candidate;
            }
        }
        return new Result(merchant, date, amount);
    }

    private static LocalDate parseDate(String line) {
        Matcher matcher = DATE.matcher(line);
        while (matcher.find()) {
            try {
                int first = Integer.parseInt(matcher.group(1));
                int middle = Integer.parseInt(matcher.group(2));
                int last = Integer.parseInt(matcher.group(3));
                if (matcher.group(1).length() == 4) return LocalDate.of(first, middle, last);
                if (matcher.group(3).length() == 2) last += last >= 70 ? 1900 : 2000;
                if (matcher.group(3).length() >= 2) return LocalDate.of(last, middle, first);
            } catch (DateTimeException | NumberFormatException ignored) { /* Try the next match. */ }
        }
        return null;
    }

    private static BigDecimal parseAmount(String line) {
        List<BigDecimal> candidates = new ArrayList<>();
        Matcher matcher = MONEY.matcher(line);
        while (matcher.find()) {
            String digits = matcher.group().replaceAll("[., ]", "");
            try {
                BigDecimal value = new BigDecimal(digits);
                if (value.signum() > 0 && value.precision() <= 17) candidates.add(value);
            } catch (NumberFormatException ignored) { /* OCR can produce malformed numbers. */ }
        }
        return candidates.isEmpty() ? null : candidates.get(candidates.size() - 1);
    }

    private static String ascii(String value) {
        return Normalizer.normalize(value.replace('đ', 'd').replace('Đ', 'D'), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
    }

    public record Result(String merchant, LocalDate occurredOn, BigDecimal amount) {}
}

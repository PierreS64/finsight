package com.finsight.budget;

import java.math.BigDecimal;

public final class BudgetAlertThreshold {
    private BudgetAlertThreshold() {}

    public static int highest(BigDecimal spent, BigDecimal limit) {
        if (limit.signum() <= 0) return 0;
        if (spent.compareTo(limit) >= 0) return 100;
        if (spent.multiply(BigDecimal.TEN).compareTo(limit.multiply(BigDecimal.valueOf(9))) >= 0) return 90;
        if (spent.multiply(BigDecimal.TEN).compareTo(limit.multiply(BigDecimal.valueOf(8))) >= 0) return 80;
        return 0;
    }
}

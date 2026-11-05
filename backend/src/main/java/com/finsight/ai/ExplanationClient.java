package com.finsight.ai;

import java.util.List;

public interface ExplanationClient {
    Explanation explain(String question, List<FinancialAssistantController.Fact> facts);
    record Explanation(String text, String source) {}
}

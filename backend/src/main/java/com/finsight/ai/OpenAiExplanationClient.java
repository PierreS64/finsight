package com.finsight.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OpenAiExplanationClient implements ExplanationClient {
    private static final URI OPENAI_ENDPOINT = URI.create("https://api.openai.com/v1/responses");
    private static final String INSTRUCTIONS = "Bạn là trợ lý giải thích các chỉ số FinSight bằng tiếng Việt. "
            + "Chỉ dựa vào các dữ kiện được cung cấp; không tính toán hoặc tạo số liệu mới. "
            + "Không viết bất kỳ chữ số nào trong phần giải thích vì ứng dụng hiển thị số xác minh riêng. "
            + "Không đưa lời khuyên đầu tư, vay hoặc sản phẩm tài chính cụ thể. "
            + "Nếu câu hỏi vượt quá dữ kiện, nói rõ bạn chưa đủ dữ liệu. Trả lời ngắn gọn, tối đa ba câu.";

    private final HttpClient http;
    private final ObjectMapper json;
    private final String apiKey;
    private final String model;
    private final URI endpoint;

    @Autowired
    public OpenAiExplanationClient(ObjectMapper json, @Value("${OPENAI_API_KEY:}") String apiKey,
                                   @Value("${OPENAI_MODEL:gpt-6-luna}") String model) {
        this(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build(), json, apiKey, model, OPENAI_ENDPOINT);
    }

    OpenAiExplanationClient(HttpClient http, ObjectMapper json, String apiKey, String model, URI endpoint) {
        this.http = http;
        this.json = json;
        this.apiKey = apiKey;
        this.model = model;
        this.endpoint = endpoint;
    }

    @Override
    public Explanation explain(String question, List<FinancialAssistantController.Fact> facts) {
        if (apiKey.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "AI chat chưa được cấu hình. Hãy đặt OPENAI_API_KEY trên backend.");
        try {
            String factsJson = json.writeValueAsString(facts);
            String payload = json.writeValueAsString(Map.of(
                    "model", model, "instructions", INSTRUCTIONS,
                    "input", "Câu hỏi người dùng: " + question + "\nDữ kiện backend đã xác minh (JSON): " + factsJson,
                    "store", false, "max_output_tokens", 400, "reasoning", Map.of("effort", "none")));
            HttpRequest request = HttpRequest.newBuilder(endpoint)
                    .timeout(Duration.ofSeconds(25))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8)).build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() != 200) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Dịch vụ AI chưa phản hồi. Hãy thử lại sau.");
            JsonNode root = json.readTree(response.body());
            StringBuilder answer = new StringBuilder();
            for (JsonNode output : root.path("output")) {
                if (!"message".equals(output.path("type").asText())) continue;
                for (JsonNode content : output.path("content")) {
                    if ("output_text".equals(content.path("type").asText())) {
                        if (answer.length() > 0) answer.append(' ');
                        answer.append(content.path("text").asText());
                    }
                }
            }
            String explanation = answer.toString().trim();
            if (explanation.isEmpty() || explanation.length() > 1500 || explanation.matches("(?s).*\\p{Nd}.*"))
                return new Explanation("Mình chỉ có thể giải thích các chỉ số đã xác minh bên dưới. Hãy xem từng mục để đối chiếu.", "VERIFIED_ONLY");
            return new Explanation(explanation, "AI_EXPLANATION");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Dịch vụ AI bị gián đoạn.");
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Không kết nối được dịch vụ AI.");
        }
    }
}

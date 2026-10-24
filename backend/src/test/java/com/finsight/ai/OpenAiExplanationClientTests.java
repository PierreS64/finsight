package com.finsight.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class OpenAiExplanationClientTests {
    private final ObjectMapper json = new ObjectMapper();
    private final List<FinancialAssistantController.Fact> facts = List.of(
            new FinancialAssistantController.Fact("expense", "Chi tiêu tháng", "100.00", "VND"));

    @Test
    void sendsOnlyFactsWithoutStorageAndRejectsGeneratedNumbers() throws Exception {
        AtomicReference<String> sent = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1/responses", exchange -> {
            sent.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] body = "{\"output\":[{\"type\":\"message\",\"content\":[{\"type\":\"output_text\",\"text\":\"Bạn đã chi 999 VND.\"}]}]}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        try {
            URI uri = URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/v1/responses");
            var client = new OpenAiExplanationClient(HttpClient.newHttpClient(), json, "test-key", "gpt-6-luna", uri);
            var answer = client.explain("Chi tiêu ra sao?", facts);
            assertThat(answer.text()).doesNotContain("999");
            assertThat(answer.source()).isEqualTo("VERIFIED_ONLY");
            var request = json.readTree(sent.get());
            assertThat(request.path("store").asBoolean()).isFalse();
            assertThat(request.path("model").asText()).isEqualTo("gpt-6-luna");
            assertThat(request.path("input").asText()).contains("100.00", "Chi tiêu ra sao?");
            assertThat(request.path("input").asText()).doesNotContain("owner_user_id", "Bearer");
        } finally { server.stop(0); }
    }

    @Test
    void missingKeyDoesNotCallProvider() {
        var client = new OpenAiExplanationClient(HttpClient.newHttpClient(), json, "", "gpt-6-luna",
                URI.create("http://127.0.0.1:1/v1/responses"));
        assertThatThrownBy(() -> client.explain("Giải thích", facts))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("503");
    }
}

package com.finsight.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.gen.ECKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class JwtValidationTests {
    private static final String ISSUER = "https://finsight-test.invalid/auth/v1";
    private static final String SUBJECT = "52525252-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    private static final ECKey KEY;
    private static final HttpServer JWKS_SERVER;

    static {
        try {
            KEY = new ECKeyGenerator(Curve.P_256).keyID("test-es256").generate();
            JWKS_SERVER = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            JWKS_SERVER.createContext("/jwks", exchange -> {
                byte[] body = new JWKSet(KEY.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, body.length);
                try (var stream = exchange.getResponseBody()) {
                    stream.write(body);
                }
            });
            JWKS_SERVER.start();
        } catch (Exception ex) {
            throw new ExceptionInInitializerError(ex);
        }
    }

    @DynamicPropertySource
    static void jwtProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri", () -> ISSUER);
        registry.add("spring.security.oauth2.resourceserver.jwt.jwk-set-uri",
                () -> "http://127.0.0.1:" + JWKS_SERVER.getAddress().getPort() + "/jwks");
    }

    @AfterAll
    static void stopJwks() {
        JWKS_SERVER.stop(0);
    }

    private static String signedToken(ECKey signingKey, String issuer, String audience, Instant expiresAt)
            throws Exception {
        var claims = new JWTClaimsSet.Builder()
                .subject(SUBJECT)
                .issuer(issuer)
                .audience(audience)
                .issueTime(Date.from(Instant.now().minusSeconds(600)))
                .expirationTime(Date.from(expiresAt))
                .build();
        var token = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.ES256)
                .keyID(KEY.getKeyID()).type(JOSEObjectType.JWT).build(), claims);
        token.sign(new ECDSASigner(signingKey));
        return token.serialize();
    }

    @Test
    void acceptsSignedTokenAndRejectsWrongSignatureExpiryIssuerAndAudience() throws Exception {
        Instant future = Instant.now().plusSeconds(300);
        String valid = signedToken(KEY, ISSUER, "authenticated", future);
        mvc.perform(get("/api/v1/session").header("Authorization", "Bearer " + valid))
                .andExpect(status().isOk()).andExpect(jsonPath("$.subject").value(SUBJECT));

        ECKey wrongKey = new ECKeyGenerator(Curve.P_256).keyID(KEY.getKeyID()).generate();
        String wrongSignature = signedToken(wrongKey, ISSUER, "authenticated", future);
        String expired = signedToken(KEY, ISSUER, "authenticated", Instant.now().minusSeconds(300));
        String wrongIssuer = signedToken(KEY, "https://other.invalid/auth/v1", "authenticated", future);
        String wrongAudience = signedToken(KEY, ISSUER, "another-service", future);
        for (String rejected : new String[] {wrongSignature, expired, wrongIssuer, wrongAudience}) {
            mvc.perform(get("/api/v1/session").header("Authorization", "Bearer " + rejected))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(get("/api/v1/session")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/session").header("Authorization", "Bearer malformed"))
                .andExpect(status().isUnauthorized());
    }

    @Autowired MockMvc mvc;
}

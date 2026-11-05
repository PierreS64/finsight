package com.finsight.transaction;

import java.io.IOException;

public interface ReceiptOcrEngine {
    String recognize(byte[] image, String extension) throws IOException;
}

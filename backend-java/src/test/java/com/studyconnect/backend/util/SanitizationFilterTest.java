package com.studyconnect.backend.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class SanitizationFilterTest {

    @Test
    void testSanitize() {
        assertEquals("where", SanitizationUtil.sanitize("$where"));
        assertEquals("gt", SanitizationUtil.sanitize("$$gt"));
        assertEquals("normalText", SanitizationUtil.sanitize("normalText"));
        assertNull(SanitizationUtil.sanitize(null));
    }
}

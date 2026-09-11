package com.studyconnect.backend.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RegexUtilTest {

    @Test
    void testEscapeRegExp() {
        assertEquals("hello\\.world", RegexUtil.escapeRegExp("hello.world"));
        assertEquals("test\\*query\\+", RegexUtil.escapeRegExp("test*query+"));
        assertEquals("plain", RegexUtil.escapeRegExp("plain"));
        assertEquals("", RegexUtil.escapeRegExp(null));
    }
}

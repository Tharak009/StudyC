#pragma once
#include <string>
#include <cstdio>

namespace std {
    template<typename... Args>
    inline std::string format(const char* fmt, Args... args) {
        if (fmt && fmt[0] == '{' && fmt[1] == '}' && fmt[2] == '%') {
            char buffer[64];
            std::snprintf(buffer, sizeof(buffer), "%g%%", args...);
            return std::string(buffer);
        }
        return fmt ? fmt : "";
    }
}

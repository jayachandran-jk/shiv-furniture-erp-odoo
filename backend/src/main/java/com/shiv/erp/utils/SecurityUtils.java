package com.shiv.erp.utils;

import com.shiv.erp.security.CustomUserDetails;
import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtils {
    public static String getCurrentUserId() {
        try {
            if (SecurityContextHolder.getContext().getAuthentication() != null) {
                Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                if (principal instanceof CustomUserDetails) {
                    return ((CustomUserDetails) principal).getUser().getId();
                }
            }
        } catch (Exception e) {
            // Ignore
        }
        return "system";
    }
}

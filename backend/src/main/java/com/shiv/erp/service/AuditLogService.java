package com.shiv.erp.service;

import com.shiv.erp.model.AuditLog;
import com.shiv.erp.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public void logChange(String userId, String entityType, String entityId, String action, String oldValue, String newValue) {
        AuditLog log = AuditLog.builder()
                .id("a-" + UUID.randomUUID().toString().substring(0, 8))
                .ts(LocalDateTime.now())
                .userId(userId)
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .oldValue(toJson(oldValue))
                .newValue(toJson(newValue))
                .build();
        auditLogRepository.save(log);
    }

    private String toJson(String val) {
        if (val == null) return null;
        String trimmed = val.trim();
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) ||
            (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
            (trimmed.startsWith("\"") && trimmed.endsWith("\""))) {
            return trimmed;
        }
        String escaped = trimmed.replace("\\", "\\\\").replace("\"", "\\\"");
        return "\"" + escaped + "\"";
    }
}

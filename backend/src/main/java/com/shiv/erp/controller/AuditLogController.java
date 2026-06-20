package com.shiv.erp.controller;

import com.shiv.erp.model.AuditLog;
import com.shiv.erp.repository.AuditLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    public AuditLogController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        return ResponseEntity.ok(auditLogRepository.findAll());
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    public ResponseEntity<List<AuditLog>> getEntityAuditLogs(
            @PathVariable String entityType,
            @PathVariable String entityId
    ) {
        return ResponseEntity.ok(auditLogRepository.findByEntityTypeAndEntityIdOrderByTsDesc(entityType, entityId));
    }
}

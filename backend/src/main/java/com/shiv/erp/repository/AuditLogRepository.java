package com.shiv.erp.repository;

import com.shiv.erp.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AuditLogRepository extends JpaRepository<AuditLog, String>, JpaSpecificationExecutor<AuditLog> {
    List<AuditLog> findTop10ByOrderByTsDesc();
    List<AuditLog> findByEntityTypeAndEntityIdOrderByTsDesc(String entityType, String entityId);
}

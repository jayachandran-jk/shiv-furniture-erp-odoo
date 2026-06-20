package com.shiv.erp.controller;

import com.shiv.erp.model.AuditLog;
import com.shiv.erp.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.persistence.criteria.Predicate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    public AuditLogController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    private String mapModuleToEntityType(String module) {
        if (module == null || module.isEmpty()) return null;
        switch (module.toLowerCase()) {
            case "products": return "Product";
            case "sales": return "SalesOrder";
            case "purchase": return "PurchaseOrder";
            case "manufacturing": return "ManufacturingOrder";
            case "settings": return "User";
            case "billofmaterials": return "BoM";
            default: return module;
        }
    }

    @GetMapping
    public ResponseEntity<Page<AuditLog>> getAuditLogs(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String user,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String action
    ) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), size, Sort.by(Sort.Direction.DESC, "ts"));
        
        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            if (from != null && !from.isEmpty()) {
                LocalDateTime fromDate = LocalDateTime.parse(from + "T00:00:00");
                predicates.add(cb.greaterThanOrEqualTo(root.get("ts"), fromDate));
            }
            if (to != null && !to.isEmpty()) {
                LocalDateTime toDate = LocalDateTime.parse(to + "T23:59:59");
                predicates.add(cb.lessThanOrEqualTo(root.get("ts"), toDate));
            }
            if (user != null && !user.isEmpty()) {
                predicates.add(cb.equal(root.get("userId"), user));
            }
            if (module != null && !module.isEmpty()) {
                String moduleLower = module.toLowerCase();
                if (moduleLower.equals("sales")) {
                    predicates.add(cb.equal(root.get("entityType"), "SalesOrder"));
                } else if (moduleLower.equals("purchase")) {
                    predicates.add(cb.or(
                        cb.equal(root.get("entityType"), "PurchaseOrder"),
                        cb.equal(root.get("entityType"), "Vendor")
                    ));
                } else if (moduleLower.equals("manufacturing")) {
                    predicates.add(cb.or(
                        cb.equal(root.get("entityType"), "ManufacturingOrder"),
                        cb.equal(root.get("entityType"), "WorkCenter"),
                        cb.equal(root.get("entityType"), "WorkOrder")
                    ));
                } else if (moduleLower.equals("products")) {
                    predicates.add(cb.equal(root.get("entityType"), "Product"));
                } else if (moduleLower.equals("settings")) {
                    predicates.add(cb.equal(root.get("entityType"), "User"));
                } else if (moduleLower.equals("bill of materials") || moduleLower.equals("billofmaterials")) {
                    predicates.add(cb.or(
                        cb.equal(root.get("entityType"), "BoM"),
                        cb.equal(root.get("entityType"), "BILL_OF_MATERIALS")
                    ));
                } else {
                    predicates.add(cb.equal(root.get("entityType"), module));
                }
            }
            if (action != null && !action.isEmpty()) {
                String actionLower = action.toLowerCase();
                if (actionLower.equals("created")) {
                    predicates.add(cb.like(cb.lower(root.get("action")), "%creat%"));
                } else if (actionLower.equals("updated")) {
                    predicates.add(cb.or(
                        cb.like(cb.lower(root.get("action")), "%updat%"),
                        cb.like(cb.lower(root.get("action")), "%confirm%"),
                        cb.like(cb.lower(root.get("action")), "%book%"),
                        cb.like(cb.lower(root.get("action")), "%receiv%"),
                        cb.like(cb.lower(root.get("action")), "%complet%"),
                        cb.like(cb.lower(root.get("action")), "%status%")
                    ));
                } else if (actionLower.equals("deleted")) {
                    predicates.add(cb.or(
                        cb.like(cb.lower(root.get("action")), "%delet%"),
                        cb.like(cb.lower(root.get("action")), "%cancel%")
                    ));
                }
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return ResponseEntity.ok(auditLogRepository.findAll(spec, pageable));
    }
    
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Long>> getAuditLogSummary() {
        List<AuditLog> allLogs = auditLogRepository.findAll();
        long totalLogs = allLogs.size();
        long creates = 0, updates = 0, deletes = 0;
        
        for (AuditLog log : allLogs) {
            String lower = log.getAction().toLowerCase();
            if (lower.contains("creat")) {
                creates++;
            } else if (lower.contains("delet") || lower.contains("cancel")) {
                deletes++;
            } else {
                updates++;
            }
        }
        
        Map<String, Long> summary = new HashMap<>();
        summary.put("totalLogs", totalLogs);
        summary.put("createCount", creates);
        summary.put("updateCount", updates);
        summary.put("deleteCount", deletes);
        
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    public ResponseEntity<List<AuditLog>> getEntityAuditLogs(
            @PathVariable String entityType,
            @PathVariable String entityId
    ) {
        return ResponseEntity.ok(auditLogRepository.findByEntityTypeAndEntityIdOrderByTsDesc(entityType, entityId));
    }
}

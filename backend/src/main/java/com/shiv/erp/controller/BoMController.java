package com.shiv.erp.controller;

import com.shiv.erp.model.BoM;
import com.shiv.erp.model.BomComponent;
import com.shiv.erp.model.BomOperation;
import com.shiv.erp.repository.BoMRepository;
import com.shiv.erp.service.AuditLogService;
import com.shiv.erp.utils.SecurityUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/boms")
public class BoMController {

    private final BoMRepository bomRepository;
    private final AuditLogService auditLogService;

    public BoMController(BoMRepository bomRepository, AuditLogService auditLogService) {
        this.bomRepository = bomRepository;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANUFACTURING','OWNER')")
    public ResponseEntity<List<BoM>> getAllBoms() {
        return ResponseEntity.ok(bomRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANUFACTURING','OWNER')")
    public ResponseEntity<?> getBomDetail(@PathVariable String id) {
        BoM bom = bomRepository.findById(id).orElse(null);
        if (bom == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Bill of Materials not found"));
        }
        return ResponseEntity.ok(bom);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANUFACTURING')")
    @Transactional
    public ResponseEntity<?> createBom(@RequestBody BoM bom) {
        if (bom.getId() == null || bom.getId().isEmpty()) {
            bom.setId("bom-" + UUID.randomUUID().toString().substring(0, 8));
        }

        if (bomRepository.findById(bom.getId()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "BoM ID is already in use"));
        }

        // Set references on sub-items
        if (bom.getComponents() != null) {
            for (BomComponent comp : bom.getComponents()) {
                comp.setBomId(bom.getId());
            }
        }

        if (bom.getOperations() != null) {
            for (BomOperation op : bom.getOperations()) {
                if (op.getId() == null || op.getId().isEmpty()) {
                    op.setId("op-" + UUID.randomUUID().toString().substring(0, 8));
                }
                op.setBomId(bom.getId());
            }
        }

        BoM saved = bomRepository.save(bom);

        auditLogService.logChange(
                SecurityUtils.getCurrentUserId(),
                "BoM",
                saved.getId(),
                "Created",
                null,
                String.format("{\"productId\": \"%s\"}", saved.getProductId())
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
}

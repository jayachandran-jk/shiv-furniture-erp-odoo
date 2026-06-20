package com.shiv.erp.controller;

import com.shiv.erp.model.Vendor;
import com.shiv.erp.repository.VendorRepository;
import com.shiv.erp.service.AuditLogService;
import com.shiv.erp.utils.SecurityUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/vendors")
public class VendorController {

    private final VendorRepository vendorRepository;
    private final AuditLogService auditLogService;

    public VendorController(VendorRepository vendorRepository, AuditLogService auditLogService) {
        this.vendorRepository = vendorRepository;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ResponseEntity<List<Vendor>> getVendors() {
        return ResponseEntity.ok(vendorRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','PURCHASE')")
    public ResponseEntity<?> createVendor(@RequestBody Vendor vendor) {
        try {
            if (vendor.getId() == null || vendor.getId().isEmpty()) {
                vendor.setId("v-" + UUID.randomUUID().toString().substring(0, 8));
            }
            if (vendor.getContact() == null || vendor.getContact().isEmpty()) {
                vendor.setContact(vendor.getPhone());
            }
            Vendor saved = vendorRepository.save(vendor);

            auditLogService.logChange(
                    SecurityUtils.getCurrentUserId(),
                    "Vendor",
                    saved.getId(),
                    "Created",
                    null,
                    String.format("{\"name\": \"%s\", \"contact\": \"%s\"}", saved.getName(), saved.getContact())
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}

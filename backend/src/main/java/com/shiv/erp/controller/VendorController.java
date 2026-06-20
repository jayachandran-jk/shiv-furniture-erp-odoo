package com.shiv.erp.controller;

import com.shiv.erp.model.Vendor;
import com.shiv.erp.repository.VendorRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/vendors")
public class VendorController {

    private final VendorRepository vendorRepository;

    public VendorController(VendorRepository vendorRepository) {
        this.vendorRepository = vendorRepository;
    }

    @GetMapping
    public ResponseEntity<List<Vendor>> getVendors() {
        return ResponseEntity.ok(vendorRepository.findAll());
    }

    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','PURCHASE')")
    public ResponseEntity<?> createVendor(@RequestBody Vendor vendor) {
        try {
            if (vendor.getId() == null || vendor.getId().isEmpty()) {
                vendor.setId("v-" + java.util.UUID.randomUUID().toString().substring(0, 8));
            }
            if (vendor.getContact() == null || vendor.getContact().isEmpty()) {
                vendor.setContact(vendor.getPhone());
            }
            Vendor saved = vendorRepository.save(vendor);
            return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.BAD_REQUEST)
                    .body(java.util.Map.of("error", e.getMessage()));
        }
    }
}

package com.shiv.erp.controller;

import com.shiv.erp.model.Customer;
import com.shiv.erp.repository.CustomerRepository;
import com.shiv.erp.service.AuditLogService;
import com.shiv.erp.utils.SecurityUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerRepository customerRepository;
    private final AuditLogService auditLogService;

    public CustomerController(CustomerRepository customerRepository, AuditLogService auditLogService) {
        this.customerRepository = customerRepository;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ResponseEntity<List<Customer>> getCustomers() {
        return ResponseEntity.ok(customerRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> createCustomer(@RequestBody Customer customer) {
        if (customer.getId() == null || customer.getId().isEmpty()) {
            customer.setId("c-" + UUID.randomUUID().toString().substring(0, 8));
        }
        if (customerRepository.findById(customer.getId()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Customer ID already exists"));
        }
        Customer saved = customerRepository.save(customer);
        auditLogService.logChange(
                SecurityUtils.getCurrentUserId(),
                "Customer",
                saved.getId(),
                "Created",
                null,
                String.format("{\"name\": \"%s\", \"contact\": \"%s\"}",
                        saved.getName(),
                        saved.getContact() != null ? saved.getContact() : "")
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCustomer(@PathVariable String id, @RequestBody Customer patch) {
        Customer customer = customerRepository.findById(id).orElse(null);
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Customer not found"));
        }
        String oldVal = String.format("{\"name\": \"%s\", \"contact\": \"%s\"}",
                customer.getName(), customer.getContact() != null ? customer.getContact() : "");
        customer.setName(patch.getName());
        customer.setContact(patch.getContact());
        customer.setAddress(patch.getAddress());
        Customer saved = customerRepository.save(customer);
        String newVal = String.format("{\"name\": \"%s\", \"contact\": \"%s\"}",
                saved.getName(), saved.getContact() != null ? saved.getContact() : "");
        auditLogService.logChange(
                SecurityUtils.getCurrentUserId(),
                "Customer",
                saved.getId(),
                "Updated",
                oldVal,
                newVal
        );
        return ResponseEntity.ok(saved);
    }
}

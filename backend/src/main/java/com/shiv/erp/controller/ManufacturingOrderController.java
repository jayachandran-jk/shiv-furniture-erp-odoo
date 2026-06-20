package com.shiv.erp.controller;

import com.shiv.erp.model.ManufacturingOrder;
import com.shiv.erp.repository.ManufacturingOrderRepository;
import com.shiv.erp.service.ManufacturingOrderService;
import com.shiv.erp.utils.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/manufacturing")
public class ManufacturingOrderController {

    private final ManufacturingOrderRepository manufacturingOrderRepository;
    private final ManufacturingOrderService manufacturingOrderService;

    public ManufacturingOrderController(ManufacturingOrderRepository manufacturingOrderRepository,
                                        ManufacturingOrderService manufacturingOrderService) {
        this.manufacturingOrderRepository = manufacturingOrderRepository;
        this.manufacturingOrderService = manufacturingOrderService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANUFACTURING','OWNER')")
    public ResponseEntity<List<ManufacturingOrder>> getOrders(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status
    ) {
        List<ManufacturingOrder> orders = manufacturingOrderRepository.findAll();

        if (status != null && !status.trim().isEmpty()) {
            orders = orders.stream()
                    .filter(o -> o.getStatus().equalsIgnoreCase(status.trim()))
                    .collect(Collectors.toList());
        }

        if (search != null && !search.trim().isEmpty()) {
            String q = search.trim().toLowerCase();
            orders = orders.stream()
                    .filter(o -> o.getNumber().toLowerCase().contains(q) || 
                                 o.getProductId().toLowerCase().contains(q))
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(orders);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANUFACTURING','OWNER')")
    public ResponseEntity<?> getOrderDetail(@PathVariable String id) {
        ManufacturingOrder mo = manufacturingOrderRepository.findById(id).orElse(null);
        if (mo == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Manufacturing order not found"));
        }
        return ResponseEntity.ok(mo);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANUFACTURING')")
    public ResponseEntity<?> createOrder(@Valid @RequestBody ManufacturingOrder draft) {
        try {
            ManufacturingOrder saved = manufacturingOrderService.createOrder(draft);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('ADMIN','MANUFACTURING')")
    public ResponseEntity<?> confirmOrder(@PathVariable String id) {
        try {
            ManufacturingOrder saved = manufacturingOrderService.confirmOrder(id);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('ADMIN','MANUFACTURING')")
    public ResponseEntity<?> completeOrder(@PathVariable String id) {
        try {
            ManufacturingOrder saved = manufacturingOrderService.completeOrder(id);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','MANUFACTURING')")
    public ResponseEntity<?> cancelOrder(@PathVariable String id) {
        try {
            ManufacturingOrder saved = manufacturingOrderService.cancelOrder(id);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{moId}/work-orders/{woId}/status")
    @PreAuthorize("hasAnyRole('ADMIN','MANUFACTURING')")
    public ResponseEntity<?> setWorkOrderStatus(
            @PathVariable String moId,
            @PathVariable String woId,
            @RequestParam(required = false) String status,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String finalStatus = status;
        if (finalStatus == null && body != null) {
            finalStatus = body.get("status");
        }

        if (finalStatus == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Status is required"));
        }

        try {
            ManufacturingOrder saved = manufacturingOrderService.setWorkOrderStatus(
                    moId,
                    woId,
                    finalStatus,
                    SecurityUtils.getCurrentUserId()
            );
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}

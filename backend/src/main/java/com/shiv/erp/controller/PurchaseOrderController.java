package com.shiv.erp.controller;

import com.shiv.erp.model.PurchaseOrder;
import com.shiv.erp.repository.PurchaseOrderRepository;
import com.shiv.erp.service.PurchaseOrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/purchase-orders")
public class PurchaseOrderController {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderService purchaseOrderService;

    public PurchaseOrderController(PurchaseOrderRepository purchaseOrderRepository, PurchaseOrderService purchaseOrderService) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderService = purchaseOrderService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','PURCHASE','OWNER')")
    public ResponseEntity<List<PurchaseOrder>> getAllOrders() {
        List<PurchaseOrder> orders = purchaseOrderRepository.findAll();
        // Sort by date descending
        orders.sort((a, b) -> b.getDate() == null ? 0 : b.getDate().compareTo(a.getDate() == null ? b.getDate() : a.getDate()));
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PURCHASE','OWNER')")
    public ResponseEntity<?> getOrderDetail(@PathVariable String id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id).orElse(null);
        if (po == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Purchase order not found"));
        }
        return ResponseEntity.ok(po);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','PURCHASE')")
    public ResponseEntity<?> createOrder(@RequestBody PurchaseOrder order) {
        try {
            PurchaseOrder saved = purchaseOrderService.createOrder(order);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('ADMIN','PURCHASE')")
    public ResponseEntity<?> confirmOrder(@PathVariable String id) {
        try {
            PurchaseOrder confirmed = purchaseOrderService.confirmOrder(id);
            return ResponseEntity.ok(confirmed);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/receive")
    @PreAuthorize("hasAnyRole('ADMIN','PURCHASE')")
    public ResponseEntity<?> receiveOrder(@PathVariable String id, @RequestBody Map<String, Integer> receipts) {
        try {
            PurchaseOrder received = purchaseOrderService.receiveOrder(id, receipts);
            return ResponseEntity.ok(received);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','PURCHASE')")
    public ResponseEntity<?> cancelOrder(@PathVariable String id) {
        try {
            PurchaseOrder cancelled = purchaseOrderService.cancelOrder(id);
            return ResponseEntity.ok(cancelled);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}

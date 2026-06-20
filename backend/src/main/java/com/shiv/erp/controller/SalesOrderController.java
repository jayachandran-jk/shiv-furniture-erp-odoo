package com.shiv.erp.controller;

import com.shiv.erp.model.SalesOrder;
import com.shiv.erp.repository.SalesOrderRepository;
import com.shiv.erp.service.SalesOrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sales-orders")
public class SalesOrderController {

    private final SalesOrderRepository salesOrderRepository;
    private final SalesOrderService salesOrderService;

    public SalesOrderController(SalesOrderRepository salesOrderRepository, SalesOrderService salesOrderService) {
        this.salesOrderRepository = salesOrderRepository;
        this.salesOrderService = salesOrderService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SALES','OWNER')")
    public ResponseEntity<List<SalesOrder>> getAllOrders() {
        List<SalesOrder> orders = salesOrderRepository.findAllByOrderByUpdatedAtDesc();
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SALES','OWNER')")
    public ResponseEntity<?> getOrderDetail(@PathVariable String id) {
        SalesOrder so = salesOrderRepository.findById(id).orElse(null);
        if (so == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Sales order not found"));
        }
        return ResponseEntity.ok(so);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SALES')")
    public ResponseEntity<?> createOrder(@RequestBody SalesOrder order) {
        try {
            SalesOrder saved = salesOrderService.createOrder(order);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SALES')")
    public ResponseEntity<?> updateOrder(@PathVariable String id, @RequestBody SalesOrder order) {
        try {
            SalesOrder updated = salesOrderService.updateOrder(id, order);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @RequestMapping(value = "/{id}/confirm", method = {RequestMethod.POST, RequestMethod.PATCH})
    @PreAuthorize("hasAnyRole('ADMIN','SALES')")
    public ResponseEntity<?> confirmOrder(@PathVariable String id) {
        try {
            SalesOrder confirmed = salesOrderService.confirmOrder(id);
            return ResponseEntity.ok(confirmed);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/deliver")
    @PreAuthorize("hasAnyRole('ADMIN','SALES')")
    public ResponseEntity<?> deliverOrder(@PathVariable String id, @RequestBody Map<String, Integer> deliveries) {
        try {
            SalesOrder delivered = salesOrderService.deliverOrder(id, deliveries);
            return ResponseEntity.ok(delivered);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','SALES')")
    public ResponseEntity<?> cancelOrder(@PathVariable String id) {
        try {
            SalesOrder cancelled = salesOrderService.cancelOrder(id);
            return ResponseEntity.ok(cancelled);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}

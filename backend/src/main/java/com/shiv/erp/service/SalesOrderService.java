package com.shiv.erp.service;

import com.shiv.erp.model.Product;
import com.shiv.erp.model.SalesOrder;
import com.shiv.erp.model.SalesOrderLine;
import com.shiv.erp.repository.ProductRepository;
import com.shiv.erp.repository.SalesOrderRepository;
import com.shiv.erp.utils.SecurityUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class SalesOrderService {

    private final SalesOrderRepository salesOrderRepository;
    private final ProductRepository productRepository;
    private final StockLedgerService stockLedgerService;
    private final ProcurementService procurementService;
    private final AuditLogService auditLogService;

    public SalesOrderService(SalesOrderRepository salesOrderRepository,
                             ProductRepository productRepository,
                             StockLedgerService stockLedgerService,
                             ProcurementService procurementService,
                             AuditLogService auditLogService) {
        this.salesOrderRepository = salesOrderRepository;
        this.productRepository = productRepository;
        this.stockLedgerService = stockLedgerService;
        this.procurementService = procurementService;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public SalesOrder createOrder(SalesOrder draft) {
        String soId = "so-" + UUID.randomUUID().toString().substring(0, 8);
        String number = procurementService.generateNextNumber("SO", salesOrderRepository.findFirstByOrderByNumberDesc().map(SalesOrder::getNumber));

        draft.setId(soId);
        draft.setNumber(number);
        draft.setStatus("Draft");
        draft.setCreatedBy(SecurityUtils.getCurrentUserId());
        if (draft.getSalespersonId() == null) {
            draft.setSalespersonId(SecurityUtils.getCurrentUserId());
        }

        if (draft.getLines() != null) {
            for (SalesOrderLine line : draft.getLines()) {
                line.setId("sol-" + UUID.randomUUID().toString().substring(0, 8));
                line.setSalesOrderId(soId);
                line.setReservedQty(0);
                line.setDeliveredQty(0);
            }
        }

        SalesOrder saved = salesOrderRepository.save(draft);

        auditLogService.logChange(
                SecurityUtils.getCurrentUserId(),
                "SalesOrder",
                saved.getId(),
                "Created",
                null,
                String.format("{\"number\": \"%s\", \"customerId\": \"%s\"}", saved.getNumber(), saved.getCustomerId())
        );

        return saved;
    }

    @Transactional
    public SalesOrder confirmOrder(String id) {
        SalesOrder so = salesOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Sales order not found: " + id));

        if (!"Draft".equals(so.getStatus())) {
            throw new IllegalStateException("Only Draft sales orders can be confirmed.");
        }

        if (so.getLines() == null || so.getLines().isEmpty()) {
            throw new IllegalStateException("Sales order must contain at least one line item.");
        }

        String userId = SecurityUtils.getCurrentUserId();

        for (SalesOrderLine line : so.getLines()) {
            Product product = productRepository.findById(line.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + line.getProductId()));

            int freeToUse = product.getOnHandQty() - product.getReservedQty();
            int orderedQty = line.getQty();
            int toReserve = Math.min(orderedQty, Math.max(0, freeToUse));

            // Set line reservations
            line.setReservedQty(toReserve);

            // Touch database through StockLedgerService (pessimistic lock on Product)
            // Note: Since confirm allows proceeding into negative territory, we reserve the FULL ordered quantity
            stockLedgerService.recordMovement(
                    product.getId(),
                    "SALES_RESERVE",
                    orderedQty,
                    "SO",
                    so.getId(),
                    "Reserve stock on Sales Order confirmation"
            );

            // Re-fetch product to get updated state (since stockLedgerService updated it)
            Product updatedProduct = productRepository.findById(product.getId()).orElse(product);
            
            // Check shortfall
            int shortfall = orderedQty - toReserve;
            if (shortfall > 0) {
                // Auto trigger procurement for shortfall
                procurementService.triggerProcurement(updatedProduct, shortfall, so.getId());
            }
        }

        so.setStatus("Confirmed");
        SalesOrder saved = salesOrderRepository.save(so);

        auditLogService.logChange(
                userId,
                "SalesOrder",
                saved.getId(),
                "Confirmed",
                "Draft",
                "Confirmed"
        );

        return saved;
    }

    @Transactional
    public SalesOrder deliverOrder(String id, Map<String, Integer> deliveries) {
        SalesOrder so = salesOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Sales order not found: " + id));

        if (!"Confirmed".equals(so.getStatus()) && !"Partially Delivered".equals(so.getStatus())) {
            throw new IllegalStateException("Deliveries can only be recorded for Confirmed or Partially Delivered orders.");
        }

        String userId = SecurityUtils.getCurrentUserId();
        boolean allFullyDelivered = true;

        for (SalesOrderLine line : so.getLines()) {
            int toDeliver = deliveries.getOrDefault(line.getId(), 0);
            if (toDeliver <= 0) {
                if (line.getDeliveredQty() < line.getQty()) {
                    allFullyDelivered = false;
                }
                continue;
            }

            int maxDeliverable = line.getQty() - line.getDeliveredQty();
            if (toDeliver > maxDeliverable) {
                throw new IllegalArgumentException(String.format("Delivery quantity %d exceeds remaining order qty %d for line %s", toDeliver, maxDeliverable, line.getId()));
            }

            // Record delivery movement
            stockLedgerService.recordMovement(
                    line.getProductId(),
                    "SALES_DELIVERY",
                    toDeliver,
                    "SO",
                    so.getId(),
                    "Deliver stock for Sales Order"
            );

            // Update line
            line.setDeliveredQty(line.getDeliveredQty() + toDeliver);
            line.setReservedQty(Math.max(0, line.getReservedQty() - toDeliver));

            if (line.getDeliveredQty() < line.getQty()) {
                allFullyDelivered = false;
            }
        }

        String oldStatus = so.getStatus();
        String newStatus = allFullyDelivered ? "Fully Delivered" : "Partially Delivered";
        so.setStatus(newStatus);
        SalesOrder saved = salesOrderRepository.save(so);

        auditLogService.logChange(
                userId,
                "SalesOrder",
                saved.getId(),
                "Delivered",
                oldStatus,
                newStatus
        );

        return saved;
    }

    @Transactional
    public SalesOrder cancelOrder(String id) {
        SalesOrder so = salesOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Sales order not found: " + id));

        if ("Fully Delivered".equals(so.getStatus()) || "Cancelled".equals(so.getStatus())) {
            throw new IllegalStateException("Fully delivered or cancelled orders cannot be cancelled.");
        }

        String userId = SecurityUtils.getCurrentUserId();
        String oldStatus = so.getStatus();

        // Release any reserved stock
        if ("Confirmed".equals(so.getStatus()) || "Partially Delivered".equals(so.getStatus())) {
            for (SalesOrderLine line : so.getLines()) {
                int remainingReserved = line.getReservedQty();
                if (remainingReserved > 0) {
                    stockLedgerService.recordMovement(
                            line.getProductId(),
                            "SALES_CANCEL",
                            remainingReserved,
                            "SO",
                            so.getId(),
                            "Release reserved stock on Sales Order cancellation"
                    );
                    line.setReservedQty(0);
                }
            }
        }

        so.setStatus("Cancelled");
        SalesOrder saved = salesOrderRepository.save(so);

        auditLogService.logChange(
                userId,
                "SalesOrder",
                saved.getId(),
                "Cancelled",
                oldStatus,
                "Cancelled"
        );

        return saved;
    }
}

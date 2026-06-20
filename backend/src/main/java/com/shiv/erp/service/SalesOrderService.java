package com.shiv.erp.service;

import com.shiv.erp.model.*;
import com.shiv.erp.repository.*;
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
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final ManufacturingOrderRepository manufacturingOrderRepository;
    private final BoMRepository bomRepository;
    private final VendorRepository vendorRepository;

    public SalesOrderService(SalesOrderRepository salesOrderRepository,
                             ProductRepository productRepository,
                             StockLedgerService stockLedgerService,
                             ProcurementService procurementService,
                             AuditLogService auditLogService,
                             PurchaseOrderRepository purchaseOrderRepository,
                             ManufacturingOrderRepository manufacturingOrderRepository,
                             BoMRepository bomRepository,
                             VendorRepository vendorRepository) {
        this.salesOrderRepository = salesOrderRepository;
        this.productRepository = productRepository;
        this.stockLedgerService = stockLedgerService;
        this.procurementService = procurementService;
        this.auditLogService = auditLogService;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.manufacturingOrderRepository = manufacturingOrderRepository;
        this.bomRepository = bomRepository;
        this.vendorRepository = vendorRepository;
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
    public SalesOrder updateOrder(String id, SalesOrder updated) {
        SalesOrder so = salesOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Sales order not found: " + id));

        if (!"Draft".equals(so.getStatus())) {
            throw new IllegalStateException("Only Draft sales orders can be modified.");
        }

        String userId = SecurityUtils.getCurrentUserId();
        String oldVal = String.format("{\"customerId\": \"%s\", \"linesCount\": %d}", so.getCustomerId(), so.getLines() != null ? so.getLines().size() : 0);

        so.setCustomerId(updated.getCustomerId());
        so.setSalespersonId(updated.getSalespersonId());

        if (so.getLines() == null) {
            so.setLines(new ArrayList<>());
        } else {
            so.getLines().clear();
        }

        if (updated.getLines() != null) {
            for (SalesOrderLine line : updated.getLines()) {
                line.setId("sol-" + UUID.randomUUID().toString().substring(0, 8));
                line.setSalesOrderId(so.getId());
                line.setReservedQty(0);
                line.setDeliveredQty(0);
                so.getLines().add(line);
            }
        }

        SalesOrder saved = salesOrderRepository.save(so);

        auditLogService.logChange(
                userId,
                "SalesOrder",
                saved.getId(),
                "Updated",
                oldVal,
                String.format("{\"customerId\": \"%s\", \"linesCount\": %d}", saved.getCustomerId(), saved.getLines() != null ? saved.getLines().size() : 0)
        );

        return saved;
    }

    @Transactional
    public SalesOrder confirmOrder(String id) {
        SalesOrder so = salesOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Sales order not found: " + id));

        if (!"Draft".equals(so.getStatus())) {
            throw new IllegalArgumentException("Only Draft sales orders can be confirmed.");
        }

        if (so.getLines() == null || so.getLines().isEmpty()) {
            throw new IllegalArgumentException("Sales order must contain at least one line item.");
        }

        String userId = SecurityUtils.getCurrentUserId();

        // 1. Check if all items are fully in stock
        boolean allInStock = true;
        Map<String, Product> productCache = new HashMap<>();
        for (SalesOrderLine line : so.getLines()) {
            Product product = productRepository.findByIdForUpdate(line.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + line.getProductId()));
            productCache.put(line.getProductId(), product);
            int freeToUse = product.getOnHandQty() - product.getReservedQty();
            if (freeToUse < line.getQty()) {
                allInStock = false;
            }
        }

        if (allInStock) {
            // All items are in stock -> reserve all, skip PO/MO, status is Partially Delivered (Ready for Delivery)
            for (SalesOrderLine line : so.getLines()) {
                Product product = productCache.get(line.getProductId());
                int orderedQty = line.getQty();
                product.setReservedQty(product.getReservedQty() + orderedQty);
                productRepository.save(product);

                stockLedgerService.recordMovement(
                        product.getId(),
                        "SALES_RESERVE",
                        orderedQty,
                        "SO",
                        so.getId(),
                        "Reserve stock on Sales Order confirmation"
                );

                line.setReservedQty(orderedQty);
                line.setShortageQty(0);
                line.setAutoCreatedOrderId(null);
                line.setAutoCreatedOrderNumber(null);
            }
            so.setStatus("Partially Delivered");
        } else {
            // Shortage exists -> run normal fallback logic, status is Confirmed
            for (SalesOrderLine line : so.getLines()) {
                Product product = productCache.get(line.getProductId());
                int freeToUse = product.getOnHandQty() - product.getReservedQty();
                int orderedQty = line.getQty();
                int reserveQty = 0;

                if (freeToUse >= orderedQty) {
                    reserveQty = orderedQty;
                    product.setReservedQty(product.getReservedQty() + reserveQty);
                    productRepository.save(product);

                    stockLedgerService.recordMovement(
                            product.getId(),
                            "SALES_RESERVE",
                            reserveQty,
                            "SO",
                            so.getId(),
                            "Reserve stock on Sales Order confirmation"
                    );

                    line.setReservedQty(reserveQty);
                    line.setShortageQty(0);
                    line.setAutoCreatedOrderId(null);
                    line.setAutoCreatedOrderNumber(null);
                } else {
                    reserveQty = Math.max(freeToUse, 0);
                    int shortageQty = orderedQty - reserveQty;

                    if (reserveQty > 0) {
                        product.setReservedQty(product.getReservedQty() + reserveQty);
                        productRepository.save(product);

                        stockLedgerService.recordMovement(
                            product.getId(),
                            "SALES_RESERVE",
                            reserveQty,
                            "SO",
                            so.getId(),
                            "Reserve stock on Sales Order confirmation"
                        );
                    }

                    line.setReservedQty(reserveQty);
                    line.setShortageQty(shortageQty);

                    String autoCreatedOrderId = null;
                    String autoCreatedOrderNumber = null;

                    if ("purchase".equalsIgnoreCase(product.getProcurementType())) {
                        String vendorId = product.getPreferredVendorId();
                        if (vendorId == null || vendorId.isEmpty()) {
                            List<Vendor> vendors = vendorRepository.findAll();
                            if (!vendors.isEmpty()) {
                                vendorId = vendors.get(0).getId();
                            } else {
                                vendorId = "v-temp";
                            }
                        }

                        String poNumber = procurementService.generateNextNumber("PO", purchaseOrderRepository.findFirstByOrderByNumberDesc().map(PurchaseOrder::getNumber));
                        String poId = "po-" + UUID.randomUUID().toString().substring(0, 8);

                        PurchaseOrderLine poLine = PurchaseOrderLine.builder()
                                .id("pol-" + UUID.randomUUID().toString().substring(0, 8))
                                .purchaseOrderId(poId)
                                .productId(product.getId())
                                .qty(shortageQty)
                                .unitPrice(product.getCostPrice() != null ? product.getCostPrice() : BigDecimal.ZERO)
                                .receivedQty(0)
                                .build();

                        List<PurchaseOrderLine> poLines = new ArrayList<>();
                        poLines.add(poLine);

                        PurchaseOrder po = PurchaseOrder.builder()
                                .id(poId)
                                .number(poNumber)
                                .vendorId(vendorId)
                                .status("Draft")
                                .createdBy(userId != null ? userId : "system")
                                .isAutoGenerated(true)
                                .triggeringSalesOrderId(so.getId())
                                .lines(poLines)
                                .build();

                        purchaseOrderRepository.save(po);

                        autoCreatedOrderId = poId;
                        autoCreatedOrderNumber = poNumber;

                        auditLogService.logChange(
                                userId != null ? userId : "system",
                                "PurchaseOrder",
                                poId,
                                "Auto-created",
                                null,
                                String.format("{\"info\": \"Draft auto-generated for %s due to stock shortfall of %d\"}", product.getSku(), shortageQty)
                        );
                    } else if ("manufacturing".equalsIgnoreCase(product.getProcurementType())) {
                        if (product.getBomId() == null || product.getBomId().isEmpty()) {
                            throw new IllegalArgumentException("No BoM linked, cannot auto-manufacture");
                        }
                        BoM bom = bomRepository.findById(product.getBomId())
                                .orElseThrow(() -> new IllegalArgumentException("No BoM linked, cannot auto-manufacture"));

                        String moNumber = procurementService.generateNextNumber("MO", manufacturingOrderRepository.findFirstByOrderByNumberDesc().map(ManufacturingOrder::getNumber));
                        String moId = "mo-" + UUID.randomUUID().toString().substring(0, 8);

                        List<MoComponent> moComponents = new ArrayList<>();
                        if (bom.getComponents() != null) {
                            for (BomComponent bc : bom.getComponents()) {
                                int reqQty = (int) Math.ceil(bc.getQty() * shortageQty);
                                moComponents.add(MoComponent.builder()
                                        .moId(moId)
                                        .productId(bc.getProductId())
                                        .requiredQty(reqQty)
                                        .toConsumeQty(reqQty)
                                        .consumedQty(0)
                                        .build());
                            }
                        }

                        List<WorkOrder> workOrders = new ArrayList<>();
                        if (bom.getOperations() != null) {
                            for (BomOperation bo : bom.getOperations()) {
                                workOrders.add(WorkOrder.builder()
                                        .id("wo-" + UUID.randomUUID().toString().substring(0, 8))
                                        .moId(moId)
                                        .name(bo.getName())
                                        .workCenterId(bo.getWorkCenterId())
                                        .status("Pending")
                                        .expectedDurationMinutes(bo.getDurationMinutes())
                                        .actualDurationMinutes(0)
                                        .build());
                            }
                        }

                        ManufacturingOrder mo = ManufacturingOrder.builder()
                                .id(moId)
                                .number(moNumber)
                                .productId(product.getId())
                                .qty(shortageQty)
                                .status("Draft")
                                .assigneeId(null)
                                .isAutoGenerated(true)
                                .triggeringSalesOrderId(so.getId())
                                .components(moComponents)
                                .workOrders(workOrders)
                                .build();

                        manufacturingOrderRepository.save(mo);

                        autoCreatedOrderId = moId;
                        autoCreatedOrderNumber = moNumber;

                        auditLogService.logChange(
                                userId != null ? userId : "system",
                                "ManufacturingOrder",
                                moId,
                                "Auto-created",
                                null,
                                String.format("{\"info\": \"Draft auto-generated for %s due to stock shortfall of %d\"}", product.getSku(), shortageQty)
                        );
                    }

                    line.setAutoCreatedOrderId(autoCreatedOrderId);
                    line.setAutoCreatedOrderNumber(autoCreatedOrderNumber);

                    stockLedgerService.recordMovement(
                            product.getId(),
                            "SHORTAGE_DETECTED",
                            shortageQty,
                            "SO",
                            so.getId(),
                            "Shortage detected for SKU: " + product.getSku()
                    );
                }
            }
            so.setStatus("Confirmed");
        }

        SalesOrder saved = salesOrderRepository.save(so);

        auditLogService.logChange(
                userId != null ? userId : "system",
                "SalesOrder",
                saved.getId(),
                "Confirmed",
                "Draft",
                saved.getStatus()
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

            // Soft-hide the product from active operations since it is delivered to the customer
            Product p = productRepository.findById(line.getProductId()).orElse(null);
            if (p != null && Boolean.TRUE.equals(p.getIsActive())) {
                p.setIsActive(false);
                productRepository.save(p);
                auditLogService.logChange(
                        userId,
                        "Product",
                        p.getId(),
                        "Soft-Hidden (Delivered)",
                        "{\"isActive\": true}",
                        "{\"isActive\": false}"
                );
            }

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

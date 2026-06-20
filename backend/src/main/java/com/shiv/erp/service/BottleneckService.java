package com.shiv.erp.service;

import com.shiv.erp.model.*;
import com.shiv.erp.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class BottleneckService {

    private final BottleneckRepository bottleneckRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final ManufacturingOrderRepository manufacturingOrderRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final ProductRepository productRepository;
    private final WorkOrderRepository workOrderRepository;
    private final AuditLogService auditLogService;

    public BottleneckService(BottleneckRepository bottleneckRepository,
                             SalesOrderRepository salesOrderRepository,
                             ManufacturingOrderRepository manufacturingOrderRepository,
                             PurchaseOrderRepository purchaseOrderRepository,
                             ProductRepository productRepository,
                             WorkOrderRepository workOrderRepository,
                             AuditLogService auditLogService) {
        this.bottleneckRepository = bottleneckRepository;
        this.salesOrderRepository = salesOrderRepository;
        this.manufacturingOrderRepository = manufacturingOrderRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.productRepository = productRepository;
        this.workOrderRepository = workOrderRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional(readOnly = true)
    public List<Bottleneck> getActiveBottlenecks() {
        return bottleneckRepository.findByStatus("ACTIVE");
    }

    @Transactional(readOnly = true)
    public List<Bottleneck> getDismissedBottlenecks() {
        return bottleneckRepository.findByStatus("DISMISSED");
    }

    @Transactional
    public Bottleneck dismissBottleneck(String id, String username) {
        Bottleneck bn = bottleneckRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Bottleneck not found: " + id));

        bn.setStatus("DISMISSED");
        bn.setIsDismissed(true);
        bn.setDismissedAt(LocalDateTime.now());
        bn.setDismissedBy(username);
        Bottleneck saved = bottleneckRepository.save(bn);

        auditLogService.logChange(
                username,
                "Bottleneck Detector",
                bn.getRecordId(),
                "Dismissed",
                "ACTIVE",
                bn.getTitle() + " on " + bn.getRecordNumber() + " dismissed by " + username
        );
        return saved;
    }

    @Transactional
    public void scanBottlenecks() {
        LocalDateTime now = LocalDateTime.now();
        List<Bottleneck> activeBefore = bottleneckRepository.findByStatus("ACTIVE");
        Set<String> currentlyDetectedKeys = new HashSet<>();

        // 1. Sales Order Stuck at Confirmed & Inventory Check Delayed & Ready for Delivery Not Dispatched
        List<SalesOrder> salesOrders = salesOrderRepository.findAll();
        for (SalesOrder so : salesOrders) {
            if ("Confirmed".equalsIgnoreCase(so.getStatus())) {
                LocalDateTime orderDate = so.getDate();
                if (orderDate != null) {
                    long minutesStuck = java.time.Duration.between(orderDate, now).toMinutes();

                    // Check if routed (e.g. MO or PO exists)
                    boolean hasMo = !manufacturingOrderRepository.findByTriggeringSalesOrderId(so.getId()).isEmpty();
                    boolean hasPo = !purchaseOrderRepository.findByTriggeringSalesOrderId(so.getId()).isEmpty();

                    // Check if stock reservation completed (at least one reserved quantity is > 0)
                    boolean hasReservation = false;
                    if (so.getLines() != null) {
                        for (SalesOrderLine line : so.getLines()) {
                            if (line.getReservedQty() != null && line.getReservedQty() > 0) {
                                hasReservation = true;
                                break;
                            }
                        }
                    }

                    if (!hasMo && !hasPo && !hasReservation) {
                        if (minutesStuck >= 30) {
                            // Stuck at Confirmed (Critical)
                            String key = "SO_STUCK_" + so.getId();
                            currentlyDetectedKeys.add(key);
                            String timeDetail = String.format("Stuck for %dh %dm with no progress", minutesStuck / 60, minutesStuck % 60);
                            String title = "Sales Order Stuck at Confirmed";
                            String impact = "Delays processing of Sales Order " + so.getNumber() + " for customer";
                            String action = "Verify procurement triggers and routing configuration for " + so.getNumber();
                            createOrUpdateBottleneck(key, "SO_STUCK", "Critical", title, so.getId(), so.getNumber(), "Sales", timeDetail, impact, action, now);
                        } else if (minutesStuck >= 15) {
                            // Inventory Check Delayed (Warning)
                            String key = "INVENTORY_DELAYED_" + so.getId();
                            currentlyDetectedKeys.add(key);
                            String timeDetail = String.format("Stuck for %dh %dm with no progress", minutesStuck / 60, minutesStuck % 60);
                            String title = "Inventory Check Delayed";
                            String impact = "Routing and inventory checking taking longer than planned for " + so.getNumber();
                            String action = "Review routing logs and check database connection";
                            createOrUpdateBottleneck(key, "INVENTORY_DELAYED", "Warning", title, so.getId(), so.getNumber(), "Inventory", timeDetail, impact, action, now);
                        }
                    }
                }
            } else if ("Ready for Delivery".equalsIgnoreCase(so.getStatus())) {
                LocalDateTime updatedAt = so.getUpdatedAt();
                if (updatedAt == null) updatedAt = so.getDate();
                if (updatedAt != null) {
                    long hoursStuck = java.time.Duration.between(updatedAt, now).toHours();
                    if (hoursStuck >= 24) {
                        String key = "DELIVERY_DELAYED_" + so.getId();
                        currentlyDetectedKeys.add(key);
                        String timeDetail = String.format("Stuck for %dh 0m with no progress", hoursStuck);
                        String title = "Ready for Delivery Not Dispatched";
                        String impact = "Customer delivery of " + so.getNumber() + " is delayed";
                        String action = "Contact logistics team to trigger shipment dispatch";
                        createOrUpdateBottleneck(key, "DELIVERY_DELAYED", "Warning", title, so.getId(), so.getNumber(), "Delivery", timeDetail, impact, action, now);
                    }
                }
            }
        }

        // 3. Manufacturing Order Not Started & MO Stalled
        List<ManufacturingOrder> mfgOrders = manufacturingOrderRepository.findAll();
        for (ManufacturingOrder mo : mfgOrders) {
            if ("Confirmed".equalsIgnoreCase(mo.getStatus())) {
                LocalDateTime moDate = mo.getDate();
                if (moDate != null) {
                    long hoursSinceCreation = java.time.Duration.between(moDate, now).toHours();
                    if (hoursSinceCreation >= 2) {
                        // Check if any work orders are started/in progress/completed
                        boolean anyWoStarted = false;
                        if (mo.getWorkOrders() != null) {
                            for (WorkOrder wo : mo.getWorkOrders()) {
                                if (!"Pending".equalsIgnoreCase(wo.getStatus())) {
                                    anyWoStarted = true;
                                    break;
                                }
                            }
                        }
                        if (!anyWoStarted) {
                            String key = "MO_NOT_STARTED_" + mo.getId();
                            currentlyDetectedKeys.add(key);
                            String timeDetail = String.format("Stuck for %dh %dm with no progress", hoursSinceCreation, java.time.Duration.between(moDate, now).toMinutes() % 60);
                            String title = "Manufacturing Order Not Started";
                            String impact = "Production delays for finished product and downstream customer orders";
                            String action = "Assign operators and start initial work centers for MO " + mo.getNumber();
                            createOrUpdateBottleneck(key, "MO_NOT_STARTED", "Warning", title, mo.getId(), mo.getNumber(), "Manufacturing", timeDetail, impact, action, now);
                        }
                    }
                }
            } else if ("In Progress".equalsIgnoreCase(mo.getStatus())) {
                boolean hasInProgressWo = false;
                LocalDateTime latestWoUpdate = null;
                if (mo.getWorkOrders() != null) {
                    for (WorkOrder wo : mo.getWorkOrders()) {
                        if ("Started".equalsIgnoreCase(wo.getStatus()) || "Paused".equalsIgnoreCase(wo.getStatus())) {
                            hasInProgressWo = true;
                        }
                        LocalDateTime woTime = wo.getStartedAt();
                        if (wo.getPausedAt() != null && (woTime == null || wo.getPausedAt().isAfter(woTime))) {
                            woTime = wo.getPausedAt();
                        }
                        if (wo.getCompletedAt() != null && (woTime == null || wo.getCompletedAt().isAfter(woTime))) {
                            woTime = wo.getCompletedAt();
                        }
                        if (woTime != null) {
                            if (latestWoUpdate == null || woTime.isAfter(latestWoUpdate)) {
                                latestWoUpdate = woTime;
                            }
                        }
                    }
                }

                if (hasInProgressWo && latestWoUpdate != null) {
                    long minutesSinceLastUpdate = java.time.Duration.between(latestWoUpdate, now).toMinutes();
                    if (minutesSinceLastUpdate >= 60) {
                        String key = "MO_STALLED_" + mo.getId();
                        currentlyDetectedKeys.add(key);
                        String timeDetail = String.format("Stuck for %dh %dm with no progress", minutesSinceLastUpdate / 60, minutesSinceLastUpdate % 60);
                        String title = "Manufacturing Order Stalled";
                        String impact = "Production has halted at a work center for " + mo.getNumber();
                        String action = "Check status of operators and machines at current work centers";
                        createOrUpdateBottleneck(key, "MO_STALLED", "Warning", title, mo.getId(), mo.getNumber(), "Manufacturing", timeDetail, impact, action, now);
                    }
                }
            }
        }

        // 4. Work Order Overtime
        List<WorkOrder> workOrders = workOrderRepository.findAll();
        for (WorkOrder wo : workOrders) {
            if ("Started".equalsIgnoreCase(wo.getStatus()) || "In Progress".equalsIgnoreCase(wo.getStatus())) {
                LocalDateTime startedAt = wo.getStartedAt();
                if (startedAt != null) {
                    long elapsedMinutes = java.time.Duration.between(startedAt, now).toMinutes() + (wo.getActualDurationMinutes() != null ? wo.getActualDurationMinutes() : 0);
                    int plannedMinutes = wo.getExpectedDurationMinutes() != null ? wo.getExpectedDurationMinutes() : 0;
                    if (plannedMinutes > 0 && elapsedMinutes > plannedMinutes) {
                        long overtimeMinutes = elapsedMinutes - plannedMinutes;
                        double overtimePercent = (double) overtimeMinutes / plannedMinutes;
                        String severity = overtimePercent >= 0.20 ? "Critical" : "Warning";

                        String key = "WO_OVERTIME_" + wo.getId();
                        currentlyDetectedKeys.add(key);
                        String timeDetail = String.format("Running %dh %dm over planned time", overtimeMinutes / 60, overtimeMinutes % 60);
                        String title = "Work Order Overtime";
                        String impact = "Delays downstream operations and extends delivery times";
                        String action = "Add extra operator resource to work center or investigate machine delay";
                        createOrUpdateBottleneck(key, "WO_OVERTIME", severity, title, wo.getId(), wo.getName(), "Manufacturing", timeDetail, impact, action, now);
                    }
                }
            }
        }

        // 7. Inventory Stockout Risk
        List<Product> products = productRepository.findAll();
        for (Product product : products) {
            if (Boolean.TRUE.equals(product.getIsActive())) {
                int freeToUse = (product.getOnHandQty() != null ? product.getOnHandQty() : 0) - (product.getReservedQty() != null ? product.getReservedQty() : 0);
                int threshold = product.getReorderThreshold() != null ? product.getReorderThreshold() : 0;
                if (freeToUse <= threshold || freeToUse <= 0) {
                    boolean hasActiveShortage = false;
                    for (SalesOrder so : salesOrders) {
                        if ("Confirmed".equalsIgnoreCase(so.getStatus()) || "Partially Delivered".equalsIgnoreCase(so.getStatus())) {
                            if (so.getLines() != null) {
                                for (SalesOrderLine line : so.getLines()) {
                                    if (line.getProductId().equals(product.getId())) {
                                        int lineShortage = line.getQty() - (line.getReservedQty() != null ? line.getReservedQty() : 0);
                                        if (lineShortage > 0) {
                                            hasActiveShortage = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        if (hasActiveShortage) break;
                    }

                    if (hasActiveShortage) {
                        String key = "STOCKOUT_RISK_" + product.getId();
                        currentlyDetectedKeys.add(key);
                        String timeDetail = String.format("Stock level: %d (threshold: %d)", freeToUse, threshold);
                        String title = "Inventory Stockout Risk";
                        String impact = "Critical shortage of component/product " + product.getName() + " blocks delivery";
                        String action = "Expedite Purchase Order or prioritize Manufacturing Order for this item";
                        createOrUpdateBottleneck(key, "STOCKOUT_RISK", "Critical", title, product.getId(), product.getSku(), "Inventory", timeDetail, impact, action, now);
                    }
                }
            }
        }

        // Auto-resolve bottlenecks that are not detected anymore
        for (Bottleneck bn : activeBefore) {
            if (!currentlyDetectedKeys.contains(bn.getType() + "_" + bn.getRecordId())) {
                bn.setStatus("RESOLVED");
                bn.setResolvedAt(now);
                bottleneckRepository.save(bn);

                long activeMinutes = java.time.Duration.between(bn.getDetectedAt(), now).toMinutes();
                auditLogService.logChange(
                        "system",
                        "Bottleneck Detector",
                        bn.getRecordId(),
                        "Auto-Resolved",
                        null,
                        String.format("%s on %s auto-resolved after %dh %dm", bn.getTitle(), bn.getRecordNumber(), activeMinutes / 60, activeMinutes % 60)
                );
            }
        }
    }

    private void createOrUpdateBottleneck(String key, String type, String severity, String title, String recordId, String recordNumber, String stage, String timeDetail, String impact, String action, LocalDateTime now) {
        Optional<Bottleneck> existingOpt = bottleneckRepository.findByTypeAndRecordIdAndStatus(type, recordId, "ACTIVE");
        if (existingOpt.isPresent()) {
            Bottleneck bn = existingOpt.get();
            bn.setSeverity(severity);
            bn.setTimeDetail(timeDetail);
            bn.setImpact(impact);
            bn.setSuggestedAction(action);
            bottleneckRepository.save(bn);
        } else {
            Optional<Bottleneck> dismissedOpt = bottleneckRepository.findByTypeAndRecordIdAndStatus(type, recordId, "DISMISSED");
            if (dismissedOpt.isPresent()) {
                Bottleneck bn = dismissedOpt.get();
                bn.setSeverity(severity);
                bn.setTimeDetail(timeDetail);
                bn.setImpact(impact);
                bn.setSuggestedAction(action);
                bottleneckRepository.save(bn);
                return;
            }

            Bottleneck bn = Bottleneck.builder()
                    .id("bn-" + UUID.randomUUID().toString().substring(0, 8))
                    .type(type)
                    .severity(severity)
                    .title(title)
                    .recordId(recordId)
                    .recordNumber(recordNumber)
                    .stage(stage)
                    .timeDetail(timeDetail)
                    .impact(impact)
                    .suggestedAction(action)
                    .detectedAt(now)
                    .status("ACTIVE")
                    .isDismissed(false)
                    .build();
            bottleneckRepository.save(bn);

            auditLogService.logChange(
                    "system",
                    "Bottleneck Detector",
                    recordId,
                    "Detected",
                    null,
                    title + " on " + recordNumber
            );
        }
    }
}

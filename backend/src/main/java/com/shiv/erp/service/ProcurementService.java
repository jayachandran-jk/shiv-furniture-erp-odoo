package com.shiv.erp.service;

import com.shiv.erp.model.*;
import com.shiv.erp.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Set;
import java.util.HashSet;

@Service
public class ProcurementService {

    private final ProductRepository productRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final ManufacturingOrderRepository manufacturingOrderRepository;
    private final BoMRepository bomRepository;
    private final AuditLogService auditLogService;
    private final VendorRepository vendorRepository;
    private final NotificationService notificationService;
    private final AutomationEventRepository automationEventRepository;
    private final SalesOrderRepository salesOrderRepository;

    public ProcurementService(ProductRepository productRepository,
                              PurchaseOrderRepository purchaseOrderRepository,
                              ManufacturingOrderRepository manufacturingOrderRepository,
                              BoMRepository bomRepository,
                              @Lazy AuditLogService auditLogService,
                              VendorRepository vendorRepository,
                              NotificationService notificationService,
                              AutomationEventRepository automationEventRepository,
                              SalesOrderRepository salesOrderRepository) {
        this.productRepository = productRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.manufacturingOrderRepository = manufacturingOrderRepository;
        this.bomRepository = bomRepository;
        this.auditLogService = auditLogService;
        this.vendorRepository = vendorRepository;
        this.notificationService = notificationService;
        this.automationEventRepository = automationEventRepository;
        this.salesOrderRepository = salesOrderRepository;
    }

    @Transactional
    public synchronized void checkAndTriggerProcurement(String productId) {
        checkAndTriggerProcurement(productId, "STOCK_CHANGE", null, null, new HashSet<>(), 0);
    }

    @Transactional
    public synchronized void checkAndTriggerProcurement(String productId, String triggerType, String triggerEntityId, String parentEventId, Set<String> visited, int depth) {
        if (depth > 5) return;
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) return;

        // Only MTS products trigger threshold-based automatic replenishment
        if (product.getStrategy() == null || !"MTS".equalsIgnoreCase(product.getStrategy())) {
            return;
        }

        int freeToUse = product.getOnHandQty() - product.getReservedQty();
        int threshold = product.getReorderThreshold();

        if (freeToUse <= threshold) {
            int shortage = threshold - freeToUse;
            if (shortage <= 0) return;

            triggerProcurementInternal(product, shortage, null, triggerType, triggerEntityId, parentEventId, visited, depth);
        }
    }

    @Transactional
    public synchronized void triggerProcurement(Product product, int shortage, String triggeringSalesOrderId) {
        triggerProcurementInternal(product, shortage, triggeringSalesOrderId, "SALES_CONFIRM", triggeringSalesOrderId, null, new HashSet<>(), 0);
    }

    @Transactional
    public synchronized AutomationEvent triggerProcurementInternal(Product product, int shortage, String triggeringSalesOrderId, String triggerType, String triggerEntityId, String parentEventId, Set<String> visited, int depth) {
        if (depth > 5) return null;
        if (visited.contains(product.getId())) return null;
        visited.add(product.getId());

        String aeId = "ae-" + UUID.randomUUID().toString().substring(0, 8);
        int freeToUse = product.getOnHandQty() - product.getReservedQty();

        AutomationEvent ae = AutomationEvent.builder()
                .id(aeId)
                .triggerType(triggerType)
                .triggerEntityId(triggerEntityId)
                .productId(product.getId())
                .productSku(product.getSku())
                .availableQty(freeToUse)
                .requiredQty(product.getStrategy() != null && "MTS".equalsIgnoreCase(product.getStrategy()) ? product.getReorderThreshold() : shortage)
                .shortageQty(shortage)
                .parentEventId(parentEventId)
                .status("SUCCESS")
                .build();

        try {
            if ("Purchase".equalsIgnoreCase(product.getProcurementType())) {
                // Check if active Purchase Order already exists (Draft, Booked, Confirmed)
                List<PurchaseOrder> activePos = purchaseOrderRepository.findActivePOsByProduct(product.getId());
                if (!activePos.isEmpty()) {
                    PurchaseOrder po = activePos.get(0);
                    PurchaseOrderLine targetLine = null;
                    if (po.getLines() != null) {
                        for (PurchaseOrderLine line : po.getLines()) {
                            if (product.getId().equals(line.getProductId())) {
                                targetLine = line;
                                break;
                            }
                        }
                    } else {
                        po.setLines(new ArrayList<>());
                    }

                    if (targetLine != null) {
                        int oldQty = targetLine.getQty();
                        targetLine.setQty(oldQty + shortage);
                        ae.setActionTaken("PO_UPDATED");
                        ae.setNotes(String.format("Shortage of %d for SKU %s resolved by increasing qty from %d to %d on existing PO %s.", shortage, product.getSku(), oldQty, targetLine.getQty(), po.getNumber()));
                    } else {
                        targetLine = PurchaseOrderLine.builder()
                                .id("pol-" + UUID.randomUUID().toString().substring(0, 8))
                                .purchaseOrderId(po.getId())
                                .productId(product.getId())
                                .qty(shortage)
                                .unitPrice(product.getCostPrice() != null ? product.getCostPrice() : BigDecimal.ZERO)
                                .receivedQty(0)
                                .build();
                        po.getLines().add(targetLine);
                        ae.setActionTaken("PO_UPDATED");
                        ae.setNotes(String.format("Shortage of %d for SKU %s resolved by adding new line to existing PO %s.", shortage, product.getSku(), po.getNumber()));
                    }
                    purchaseOrderRepository.save(po);

                    ae.setGeneratedDocId(po.getId());
                    ae.setGeneratedDocNumber(po.getNumber());

                    notificationService.notifyUserOrRoles(
                            null,
                            List.of("purchase", "admin"),
                            "Purchase Order Updated (Auto-replenish)",
                            String.format("PO %s quantity updated due to shortfall of %d for SKU %s.", po.getNumber(), shortage, product.getSku()),
                            "PURCHASE_ORDER",
                            po.getId()
                    );

                    auditLogService.logChange(
                            "system",
                            "PurchaseOrder",
                            po.getId(),
                            "Auto-updated",
                            null,
                            String.format("{\"info\": \"Quantity increased on PO %s for %s due to stock shortfall of %d\"}", po.getNumber(), product.getSku(), shortage)
                    );
                } else {
                    // Create new PO
                    String vendorId = product.getPreferredVendorId();
                    if (vendorId == null || vendorId.isEmpty()) {
                        List<Vendor> vendors = vendorRepository.findAll();
                        if (!vendors.isEmpty()) {
                            vendorId = vendors.get(0).getId();
                        } else {
                            vendorId = "v-temp"; // Default fallback
                        }
                    }

                    String poNumber = generateNextNumber("PO", purchaseOrderRepository.findFirstByOrderByNumberDesc().map(PurchaseOrder::getNumber));
                    String poId = "po-" + UUID.randomUUID().toString().substring(0, 8);

                    PurchaseOrderLine line = PurchaseOrderLine.builder()
                            .id("pol-" + UUID.randomUUID().toString().substring(0, 8))
                            .purchaseOrderId(poId)
                            .productId(product.getId())
                            .qty(shortage)
                            .unitPrice(product.getCostPrice() != null ? product.getCostPrice() : BigDecimal.ZERO)
                            .receivedQty(0)
                            .build();

                    List<PurchaseOrderLine> lines = new ArrayList<>();
                    lines.add(line);

                    PurchaseOrder po = PurchaseOrder.builder()
                            .id(poId)
                            .number(poNumber)
                            .vendorId(vendorId)
                            .status("Draft")
                            .createdBy("system")
                            .isAutoGenerated(true)
                            .triggeringSalesOrderId(triggeringSalesOrderId)
                            .lines(lines)
                            .build();

                    purchaseOrderRepository.save(po);

                    ae.setActionTaken("PO_CREATED");
                    ae.setGeneratedDocId(poId);
                    ae.setGeneratedDocNumber(poNumber);
                    ae.setNotes(String.format("Shortage of %d for SKU %s resolved by creating new draft PO %s.", shortage, product.getSku(), poNumber));

                    notificationService.notifyUserOrRoles(
                            null,
                            List.of("purchase", "admin"),
                            "Auto-created Purchase Order",
                            String.format("Draft Purchase Order %s auto-generated due to stock shortfall of %d for SKU %s.", poNumber, shortage, product.getSku()),
                            "PURCHASE_ORDER",
                            poId
                    );

                    // Notify sales rep if triggered by a sales order
                    if (triggeringSalesOrderId != null && !triggeringSalesOrderId.isEmpty()) {
                        salesOrderRepository.findById(triggeringSalesOrderId).ifPresent(so -> {
                            String repId = so.getCreatedBy();
                            if (repId != null && !repId.isEmpty()) {
                                notificationService.createNotification(
                                        repId,
                                        "Procurement Raised for Your Order",
                                        String.format("Stock shortage of %d for SKU %s on Sales Order %s. Draft PO %s has been auto-created.", shortage, product.getSku(), so.getNumber(), poNumber),
                                        "PURCHASE_ORDER",
                                        poId
                                );
                            }
                        });
                    }

                    auditLogService.logChange(
                            "system",
                            "PurchaseOrder",
                            poId,
                            "Auto-created",
                            null,
                            String.format("{\"info\": \"Draft auto-generated for %s due to stock shortfall of %d\"}", product.getSku(), shortage)
                    );
                }
            } else if ("Manufacturing".equalsIgnoreCase(product.getProcurementType())) {
                // Check if active Manufacturing Order already exists (Draft, Confirmed, In Progress)
                List<ManufacturingOrder> activeMos = manufacturingOrderRepository.findActiveMOsByProduct(product.getId());
                if (!activeMos.isEmpty()) {
                    ManufacturingOrder mo = activeMos.get(0);
                    int oldQty = mo.getQty();
                    mo.setQty(oldQty + shortage);

                    BoM bom = bomRepository.findByProductIdAndIsActiveTrue(product.getId()).orElse(null);
                    if (bom != null && bom.getComponents() != null) {
                        for (BomComponent bc : bom.getComponents()) {
                            MoComponent targetComp = null;
                            if (mo.getComponents() != null) {
                                for (MoComponent moc : mo.getComponents()) {
                                    if (bc.getProductId().equals(moc.getProductId())) {
                                        targetComp = moc;
                                        break;
                                    }
                                }
                            }
                            int additionalCompQty = (int) Math.ceil(bc.getQty() * shortage);
                            if (targetComp != null) {
                                targetComp.setRequiredQty(targetComp.getRequiredQty() + additionalCompQty);
                                targetComp.setToConsumeQty(targetComp.getToConsumeQty() + additionalCompQty);
                            } else {
                                if (mo.getComponents() == null) {
                                    mo.setComponents(new ArrayList<>());
                                }
                                mo.getComponents().add(MoComponent.builder()
                                        .moId(mo.getId())
                                        .productId(bc.getProductId())
                                        .requiredQty(additionalCompQty)
                                        .toConsumeQty(additionalCompQty)
                                        .consumedQty(0)
                                        .build());
                            }
                        }
                    }

                    manufacturingOrderRepository.save(mo);

                    ae.setActionTaken("MO_UPDATED");
                    ae.setGeneratedDocId(mo.getId());
                    ae.setGeneratedDocNumber(mo.getNumber());
                    ae.setNotes(String.format("Shortage of %d for SKU %s resolved by increasing qty from %d to %d on existing MO %s.", shortage, product.getSku(), oldQty, mo.getQty(), mo.getNumber()));

                    notificationService.notifyUserOrRoles(
                            null,
                            List.of("manufacturing", "admin"),
                            "Manufacturing Order Updated (Auto-replenish)",
                            String.format("MO %s quantity updated due to shortfall of %d for SKU %s.", mo.getNumber(), shortage, product.getSku()),
                            "MANUFACTURING_ORDER",
                            mo.getId()
                    );

                    auditLogService.logChange(
                            "system",
                            "ManufacturingOrder",
                            mo.getId(),
                            "Auto-updated",
                            null,
                            String.format("{\"info\": \"Quantity increased on MO %s for %s due to stock shortfall of %d\"}", mo.getNumber(), product.getSku(), shortage)
                    );

                    // Trigger recursive checks for increased component requirements
                    if (bom != null && bom.getComponents() != null) {
                        for (BomComponent bc : bom.getComponents()) {
                            int additionalCompQty = (int) Math.ceil(bc.getQty() * shortage);
                            Product compProduct = productRepository.findById(bc.getProductId()).orElse(null);
                            if (compProduct != null) {
                                int compFree = compProduct.getOnHandQty() - compProduct.getReservedQty();
                                if (compFree < additionalCompQty) {
                                    int compShortage = additionalCompQty - Math.max(0, compFree);
                                    checkAndTriggerProcurementOrInternal(compProduct, compShortage, triggeringSalesOrderId, triggerType, triggerEntityId, aeId, visited, depth + 1);
                                }
                            }
                        }
                    }
                } else {
                    BoM bom = bomRepository.findByProductIdAndIsActiveTrue(product.getId()).orElse(null);
                    if (bom == null) {
                        ae.setStatus("FAILED");
                        ae.setNotes(String.format("Failed to manufacture SKU %s: No active Bill of Materials found.", product.getSku()));
                        automationEventRepository.save(ae);
                        return ae;
                    }

                    String moNumber = generateNextNumber("MO", manufacturingOrderRepository.findFirstByOrderByNumberDesc().map(ManufacturingOrder::getNumber));
                    String moId = "mo-" + UUID.randomUUID().toString().substring(0, 8);

                    List<MoComponent> moComponents = new ArrayList<>();
                    if (bom.getComponents() != null) {
                        for (BomComponent bc : bom.getComponents()) {
                            int reqQty = (int) Math.ceil(bc.getQty() * shortage);
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
                            .qty(shortage)
                            .status("Draft")
                            .assigneeId(null)
                            .isAutoGenerated(true)
                            .triggeringSalesOrderId(triggeringSalesOrderId)
                            .components(moComponents)
                            .workOrders(workOrders)
                            .build();

                    manufacturingOrderRepository.save(mo);

                    ae.setActionTaken("MO_CREATED");
                    ae.setGeneratedDocId(moId);
                    ae.setGeneratedDocNumber(moNumber);
                    ae.setNotes(String.format("Shortage of %d for SKU %s resolved by creating new draft MO %s.", shortage, product.getSku(), moNumber));

                    notificationService.notifyUserOrRoles(
                            null,
                            List.of("manufacturing", "admin"),
                            "Auto-created Manufacturing Order",
                            String.format("Draft Manufacturing Order %s auto-generated due to stock shortfall of %d for SKU %s.", moNumber, shortage, product.getSku()),
                            "MANUFACTURING_ORDER",
                            moId
                    );

                    // Notify sales rep if triggered by a sales order
                    if (triggeringSalesOrderId != null && !triggeringSalesOrderId.isEmpty()) {
                        salesOrderRepository.findById(triggeringSalesOrderId).ifPresent(so -> {
                            String repId = so.getCreatedBy();
                            if (repId != null && !repId.isEmpty()) {
                                notificationService.createNotification(
                                        repId,
                                        "Manufacturing Raised for Your Order",
                                        String.format("Stock shortage of %d for SKU %s on Sales Order %s. Draft MO %s has been auto-created.", shortage, product.getSku(), so.getNumber(), moNumber),
                                        "MANUFACTURING_ORDER",
                                        moId
                                );
                            }
                        });
                    }

                    auditLogService.logChange(
                            "system",
                            "ManufacturingOrder",
                            moId,
                            "Auto-created",
                            null,
                            String.format("{\"info\": \"Draft auto-generated for %s due to stock shortfall of %d\"}", product.getSku(), shortage)
                    );

                    // Trigger recursive checks for components
                    if (bom.getComponents() != null) {
                        for (BomComponent bc : bom.getComponents()) {
                            int reqQty = (int) Math.ceil(bc.getQty() * shortage);
                            Product compProduct = productRepository.findById(bc.getProductId()).orElse(null);
                            if (compProduct != null) {
                                int compFree = compProduct.getOnHandQty() - compProduct.getReservedQty();
                                if (compFree < reqQty) {
                                    int compShortage = reqQty - Math.max(0, compFree);
                                    checkAndTriggerProcurementOrInternal(compProduct, compShortage, triggeringSalesOrderId, triggerType, triggerEntityId, aeId, visited, depth + 1);
                                }
                            }
                        }
                    }
                }
            } else {
                ae.setStatus("FAILED");
                ae.setNotes(String.format("Unknown procurement type: %s for product %s.", product.getProcurementType(), product.getSku()));
            }
        } catch (Exception ex) {
            ae.setStatus("FAILED");
            ae.setNotes("Exception during procurement triggering: " + ex.getMessage());
        }

        automationEventRepository.save(ae);
        return ae;
    }

    @Transactional
    protected void checkAndTriggerProcurementOrInternal(Product product, int shortage, String triggeringSalesOrderId, String triggerType, String triggerEntityId, String parentEventId, Set<String> visited, int depth) {
        if ("MTS".equalsIgnoreCase(product.getStrategy())) {
            int freeToUse = product.getOnHandQty() - product.getReservedQty();
            int threshold = product.getReorderThreshold();
            int replenishmentNeeded = threshold - freeToUse;
            if (replenishmentNeeded > 0) {
                int totalShortage = Math.max(shortage, replenishmentNeeded);
                triggerProcurementInternal(product, totalShortage, triggeringSalesOrderId, triggerType, triggerEntityId, parentEventId, visited, depth);
            } else {
                triggerProcurementInternal(product, shortage, triggeringSalesOrderId, triggerType, triggerEntityId, parentEventId, visited, depth);
            }
        } else {
            triggerProcurementInternal(product, shortage, triggeringSalesOrderId, triggerType, triggerEntityId, parentEventId, visited, depth);
        }
    }

    public String generateNextNumber(String prefix, Optional<String> lastNumberOpt) {
        if (!lastNumberOpt.isPresent()) {
            return String.format("%s-%06d", prefix, 1);
        }

        String lastNum = lastNumberOpt.get();
        try {
            String[] parts = lastNum.split("-");
            if (parts.length > 1) {
                String seqStr = parts[parts.length - 1];
                int nextSeq = Integer.parseInt(seqStr) + 1;

                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < parts.length - 1; i++) {
                    if (i > 0) sb.append("-");
                    sb.append(parts[i]);
                }

                String formatStr = "%s-%0" + seqStr.length() + "d";
                return String.format(formatStr, sb.toString(), nextSeq);
            }
        } catch (Exception e) {
            // Fail-safe
        }
        return String.format("%s-%06d", prefix, 1);
    }
}

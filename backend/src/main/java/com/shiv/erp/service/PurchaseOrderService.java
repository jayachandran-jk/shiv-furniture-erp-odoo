package com.shiv.erp.service;

import com.shiv.erp.model.ManufacturingOrder;
import com.shiv.erp.model.MoComponent;
import com.shiv.erp.model.Product;
import com.shiv.erp.model.PurchaseOrder;
import com.shiv.erp.model.PurchaseOrderLine;
import com.shiv.erp.model.ShortageTicket;
import com.shiv.erp.repository.ManufacturingOrderRepository;
import com.shiv.erp.repository.ProductRepository;
import com.shiv.erp.repository.PurchaseOrderRepository;
import com.shiv.erp.repository.SalesOrderRepository;
import com.shiv.erp.repository.ShortageTicketRepository;
import com.shiv.erp.utils.SecurityUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final StockLedgerService stockLedgerService;
    private final ProcurementService procurementService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final SalesOrderRepository salesOrderRepository;
    private final ManufacturingOrderRepository manufacturingOrderRepository;
    private final ProductRepository productRepository;
    private final ShortageTicketRepository shortageTicketRepository;

    public PurchaseOrderService(PurchaseOrderRepository purchaseOrderRepository,
                               StockLedgerService stockLedgerService,
                               ProcurementService procurementService,
                               AuditLogService auditLogService,
                               NotificationService notificationService,
                               SalesOrderRepository salesOrderRepository,
                               ManufacturingOrderRepository manufacturingOrderRepository,
                               ProductRepository productRepository,
                               ShortageTicketRepository shortageTicketRepository) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.stockLedgerService = stockLedgerService;
        this.procurementService = procurementService;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
        this.salesOrderRepository = salesOrderRepository;
        this.manufacturingOrderRepository = manufacturingOrderRepository;
        this.productRepository = productRepository;
        this.shortageTicketRepository = shortageTicketRepository;
    }

    public String normalizeStatus(String status) {
        if (status == null) return "Draft";
        switch (status.toUpperCase()) {
            case "DRAFT": return "Draft";
            case "BOOKED": return "Booked";
            case "CONFIRMED": return "Confirmed";
            case "PARTIALLY_RECEIVED":
            case "PARTIALLY RECEIVED": return "Partially Received";
            case "FULLY_RECEIVED":
            case "FULLY RECEIVED": return "Fully Received";
            case "CANCELLED": return "Cancelled";
            default: return status;
        }
    }

    public List<PurchaseOrder> getFilteredOrders(String status, String vendorId, String dateFrom, String dateTo) {
        List<PurchaseOrder> all = purchaseOrderRepository.findAllByOrderByUpdatedAtDesc();

        return all.stream().filter(po -> {
            if (status != null && !status.isEmpty()) {
                if (!po.getStatus().equalsIgnoreCase(status) && !normalizeStatus(po.getStatus()).equalsIgnoreCase(normalizeStatus(status))) {
                    return false;
                }
            }
            if (vendorId != null && !vendorId.isEmpty() && !vendorId.equals(po.getVendorId())) {
                return false;
            }
            if (dateFrom != null && !dateFrom.isEmpty()) {
                try {
                    LocalDateTime from = LocalDateTime.parse(dateFrom + "T00:00:00");
                    if (po.getDate() == null || po.getDate().isBefore(from)) return false;
                } catch (Exception e) {
                    // Ignore date parse errors
                }
            }
            if (dateTo != null && !dateTo.isEmpty()) {
                try {
                    LocalDateTime to = LocalDateTime.parse(dateTo + "T23:59:59");
                    if (po.getDate() == null || po.getDate().isAfter(to)) return false;
                } catch (Exception e) {
                    // Ignore date parse errors
                }
            }
            return true;
        }).collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public PurchaseOrder createOrder(PurchaseOrder draft) {
        String poId = "po-" + UUID.randomUUID().toString().substring(0, 8);
        
        String lastNumber = purchaseOrderRepository.findMaxPoNumber();
        int next = 1;
        if (lastNumber != null) {
            try {
                String clean = lastNumber.replace("PO-", "").replace("-", "");
                next = Integer.parseInt(clean) + 1;
            } catch (Exception e) {
                next = 1;
            }
        }
        String poNumber = String.format("PO-%06d", next);

        draft.setId(poId);
        draft.setNumber(poNumber);
        draft.setStatus("Draft");
        draft.setCreatedBy(SecurityUtils.getCurrentUserId());
        draft.setIsAutoGenerated(false);

        if (draft.getLines() != null) {
            for (PurchaseOrderLine line : draft.getLines()) {
                line.setId("pol-" + UUID.randomUUID().toString().substring(0, 8));
                line.setPurchaseOrderId(poId);
                line.setReceivedQty(0);
            }
        }

        PurchaseOrder saved = purchaseOrderRepository.save(draft);

        auditLogService.logChange(
                SecurityUtils.getCurrentUserId(),
                "PurchaseOrder",
                saved.getId(),
                "Created",
                null,
                String.format("{\"number\": \"%s\", \"vendorId\": \"%s\"}", saved.getNumber(), saved.getVendorId())
        );

        return saved;
    }

    @Transactional
    public PurchaseOrder updateOrder(String id, PurchaseOrder updated) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Purchase order not found: " + id));

        if (!"Draft".equalsIgnoreCase(po.getStatus())) {
            throw new IllegalStateException("Only Draft purchase orders can be updated.");
        }

        po.setVendorId(updated.getVendorId());
        po.setExpectedDeliveryDate(updated.getExpectedDeliveryDate());
        po.setNotes(updated.getNotes());

        if (po.getLines() == null) {
            po.setLines(new ArrayList<>());
        } else {
            po.getLines().clear();
        }

        if (updated.getLines() != null) {
            for (PurchaseOrderLine line : updated.getLines()) {
                line.setId("pol-" + UUID.randomUUID().toString().substring(0, 8));
                line.setPurchaseOrderId(id);
                line.setReceivedQty(0);
                po.getLines().add(line);
            }
        }

        PurchaseOrder saved = purchaseOrderRepository.save(po);

        auditLogService.logChange(
                SecurityUtils.getCurrentUserId(),
                "PurchaseOrder",
                saved.getId(),
                "Updated",
                null,
                "Updated draft fields and lines"
        );

        return saved;
    }

    @Transactional
    public PurchaseOrder bookOrder(String id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Purchase order not found: " + id));

        if (!"Draft".equalsIgnoreCase(po.getStatus())) {
            throw new IllegalStateException("Only Draft purchase orders can be booked.");
        }

        if (po.getLines() == null || po.getLines().isEmpty()) {
            throw new IllegalStateException("Purchase order must contain at least one line item.");
        }

        po.setStatus("Booked");
        PurchaseOrder saved = purchaseOrderRepository.save(po);

        auditLogService.logChange(
                SecurityUtils.getCurrentUserId(),
                "PurchaseOrder",
                saved.getId(),
                "Booked",
                "Draft",
                "Booked"
        );

        return saved;
    }

    @Transactional
    public PurchaseOrder confirmOrder(String id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Purchase order not found: " + id));

        if (!"Booked".equalsIgnoreCase(po.getStatus())) {
            throw new IllegalStateException("Only Booked purchase orders can be confirmed.");
        }

        if (po.getLines() == null || po.getLines().isEmpty()) {
            throw new IllegalStateException("Purchase order must contain at least one line item.");
        }

        String userId = SecurityUtils.getCurrentUserId();
        po.setStatus("Confirmed");
        PurchaseOrder saved = purchaseOrderRepository.save(po);

        auditLogService.logChange(
                userId,
                "PurchaseOrder",
                saved.getId(),
                "Confirmed",
                "Booked",
                "Confirmed"
        );

        return saved;
    }

    @Transactional
    public PurchaseOrder receiveOrder(String id, Map<String, Integer> receipts) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Purchase order not found: " + id));

        if (!"Confirmed".equalsIgnoreCase(po.getStatus()) && !"Partially Received".equalsIgnoreCase(po.getStatus())) {
            throw new IllegalStateException("Goods can only be received for Confirmed or Partially Received purchase orders.");
        }

        String userId = SecurityUtils.getCurrentUserId();
        boolean allFullyReceived = true;
        
        List<String> receivedLogDetails = new ArrayList<>();

        for (PurchaseOrderLine line : po.getLines()) {
            int toReceive = receipts.getOrDefault(line.getId(), 0);
            int maxReceivable = line.getQty() - line.getReceivedQty();
            
            if (toReceive > 0) {
                if (toReceive > maxReceivable) {
                    throw new IllegalArgumentException(String.format("Receipt quantity %d exceeds remaining order qty %d for line %s", toReceive, maxReceivable, line.getId()));
                }

                // Record receipt movement (this will increase on_hand_qty and check safety stock limits)
                stockLedgerService.executeMovement(
                        line.getProductId(),
                        "PURCHASE_RECEIPT",
                        toReceive,
                        "PO",
                        po.getId(),
                        "Receive stock from Purchase Order"
                );

                // Update line
                line.setReceivedQty(line.getReceivedQty() + toReceive);
                
                Product prod = productRepository.findById(line.getProductId()).orElse(null);
                String prodName = prod != null ? prod.getName() : line.getProductId();
                receivedLogDetails.add(String.format("{\"productId\": \"%s\", \"productName\": \"%s\", \"receivedQty\": %d}", line.getProductId(), prodName, toReceive));
            }

            if (line.getReceivedQty() < line.getQty()) {
                allFullyReceived = false;
            }
        }

        String oldStatus = po.getStatus();
        String newStatus = allFullyReceived ? "Fully Received" : "Partially Received";
        po.setStatus(newStatus);
        PurchaseOrder saved = purchaseOrderRepository.save(po);

        // Notify sales rep if linked to a Sales Order
        if (saved.getTriggeringSalesOrderId() != null && !saved.getTriggeringSalesOrderId().isEmpty()) {
            salesOrderRepository.findById(saved.getTriggeringSalesOrderId()).ifPresent(so -> {
                String repId = so.getCreatedBy();
                if (repId != null && !repId.isEmpty()) {
                    notificationService.createNotification(
                            repId,
                            "MTO Stock Available",
                            String.format("Shortage resolved for Sales Order %s. Link stock is now received from PO %s.", so.getNumber(), saved.getNumber()),
                            "SALES_ORDER",
                            so.getId()
                    );
                }
            });
        }

        // Notify operations role
        int linesCount = po.getLines().size();
        notificationService.notifyRole(
                "OPERATIONS",
                "PO Received: " + saved.getNumber(),
                "Stock updated for " + linesCount + " product(s)",
                "PURCHASE_ORDER",
                saved.getId()
        );

        String receiptJson = "[" + String.join(", ", receivedLogDetails) + "]";
        
        auditLogService.logChange(
                userId,
                "PurchaseOrder",
                saved.getId(),
                "Received",
                oldStatus,
                String.format("{\"newStatus\": \"%s\", \"receivedLines\": %s}", newStatus, receiptJson)
        );

        // Resolve shortage tickets linked to this PO
        if ("Fully Received".equals(newStatus)) {
            List<ShortageTicket> tickets = shortageTicketRepository.findByPoId(saved.getId());
            for (ShortageTicket ticket : tickets) {
                if ("OPEN".equals(ticket.getStatus())) {
                    ticket.setStatus("RESOLVED");
                    shortageTicketRepository.save(ticket);
                    // Notify the MO assignee
                    ManufacturingOrder linkedMo = manufacturingOrderRepository.findById(ticket.getMoId()).orElse(null);
                    if (linkedMo != null && linkedMo.getAssigneeId() != null) {
                        Product shortProduct = productRepository.findById(ticket.getProductId()).orElse(null);
                        String prodName = shortProduct != null ? shortProduct.getName() : ticket.getProductId();
                        notificationService.createNotification(
                                linkedMo.getAssigneeId(),
                                "Shortage Resolved",
                                String.format("Shortage of %s for MO %s has been resolved. PO %s is fully received.",
                                        prodName, linkedMo.getNumber(), saved.getNumber()),
                                "MANUFACTURING_ORDER",
                                linkedMo.getId()
                        );
                    }
                }
            }
        }

        // Unblock any MOs that were "Waiting for Materials" for received products
        for (PurchaseOrderLine line : saved.getLines()) {
            List<ManufacturingOrder> waitingMOs = manufacturingOrderRepository.findWaitingMOsByComponentProduct(line.getProductId());
            for (ManufacturingOrder mo : waitingMOs) {
                boolean allSatisfied = true;
                if (mo.getComponents() != null) {
                    for (MoComponent comp : mo.getComponents()) {
                        Product compProd = productRepository.findById(comp.getProductId()).orElse(null);
                        if (compProd == null || compProd.getOnHandQty() < comp.getRequiredQty()) {
                            allSatisfied = false;
                            break;
                        }
                    }
                }
                if (allSatisfied) {
                    mo.setStatus("Confirmed");
                    manufacturingOrderRepository.save(mo);
                    auditLogService.logChange(
                            "system",
                            "ManufacturingOrder",
                            mo.getId(),
                            "Unblocked",
                            "Waiting for Materials",
                            "Confirmed"
                    );
                    notificationService.notifyUserOrRoles(
                            mo.getAssigneeId(),
                            List.of("manufacturing", "admin"),
                            "MO Unblocked — Ready to Produce",
                            String.format("Manufacturing Order %s now has all materials available. Production can begin.", mo.getNumber()),
                            "MANUFACTURING_ORDER",
                            mo.getId()
                    );
                    // Notify linked sales rep if MTO-triggered
                    if (mo.getTriggeringSalesOrderId() != null) {
                        salesOrderRepository.findById(mo.getTriggeringSalesOrderId()).ifPresent(so -> {
                            String repId = so.getCreatedBy();
                            if (repId != null && !repId.isEmpty()) {
                                notificationService.createNotification(
                                        repId,
                                        "Production Unblocked for Your Order",
                                        String.format("All materials are now available for MO %s linked to Sales Order %s. Production will start soon.", mo.getNumber(), so.getNumber()),
                                        "SALES_ORDER",
                                        so.getId()
                                );
                            }
                        });
                    }
                }
            }
        }

        return saved;
    }

    @Transactional
    public PurchaseOrder cancelOrder(String id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Purchase order not found: " + id));

        if (!"Draft".equalsIgnoreCase(po.getStatus()) && !"Booked".equalsIgnoreCase(po.getStatus())) {
            throw new IllegalStateException("Only Draft or Booked purchase orders can be cancelled.");
        }

        String userId = SecurityUtils.getCurrentUserId();
        String oldStatus = po.getStatus();

        po.setStatus("Cancelled");
        PurchaseOrder saved = purchaseOrderRepository.save(po);

        auditLogService.logChange(
                userId,
                "PurchaseOrder",
                saved.getId(),
                "Cancelled",
                oldStatus,
                "Cancelled"
        );

        return saved;
    }
}

package com.shiv.erp.service;

import com.shiv.erp.model.*;
import com.shiv.erp.repository.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class SimulationService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderService purchaseOrderService;
    private final ManufacturingOrderRepository manufacturingOrderRepository;
    private final ManufacturingOrderService manufacturingOrderService;
    private final SalesOrderRepository salesOrderRepository;
    private final SalesOrderService salesOrderService;
    private final ProductRepository productRepository;

    public SimulationService(PurchaseOrderRepository purchaseOrderRepository,
                             PurchaseOrderService purchaseOrderService,
                             ManufacturingOrderRepository manufacturingOrderRepository,
                             ManufacturingOrderService manufacturingOrderService,
                             SalesOrderRepository salesOrderRepository,
                             SalesOrderService salesOrderService,
                             ProductRepository productRepository) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderService = purchaseOrderService;
        this.manufacturingOrderRepository = manufacturingOrderRepository;
        this.manufacturingOrderService = manufacturingOrderService;
        this.salesOrderRepository = salesOrderRepository;
        this.salesOrderService = salesOrderService;
        this.productRepository = productRepository;
    }

    @Scheduled(fixedDelay = 5000)
    public void runSimulationStep() {
        try {
            processPurchaseOrdersSimulation();
            processManufacturingOrdersSimulation();
            processSalesOrdersSimulation();
        } catch (Exception e) {
            // Safety wrapper
        }
    }

    private void processPurchaseOrdersSimulation() {
        List<PurchaseOrder> orders = purchaseOrderRepository.findAll();
        for (PurchaseOrder po : orders) {
            if ("Draft".equals(po.getStatus())) {
                try {
                    purchaseOrderService.confirmOrder(po.getId());
                } catch (Exception e) {
                    // Ignore
                }
            } else if ("Confirmed".equals(po.getStatus()) || "Partially Received".equals(po.getStatus())) {
                Map<String, Integer> receipts = new HashMap<>();
                boolean hasReceipts = false;
                for (PurchaseOrderLine line : po.getLines()) {
                    int remaining = line.getQty() - line.getReceivedQty();
                    if (remaining > 0) {
                        receipts.put(line.getId(), remaining);
                        hasReceipts = true;
                    }
                }
                if (hasReceipts) {
                    try {
                        purchaseOrderService.receiveOrder(po.getId(), receipts);
                    } catch (Exception e) {
                        // Ignore
                    }
                }
            }
        }
    }

    private void processManufacturingOrdersSimulation() {
        List<ManufacturingOrder> orders = manufacturingOrderRepository.findAll();
        for (ManufacturingOrder mo : orders) {
            if ("Draft".equals(mo.getStatus())) {
                try {
                    manufacturingOrderService.confirmOrder(mo.getId());
                } catch (Exception e) {
                    // Ignore
                }
            } else if ("Confirmed".equals(mo.getStatus()) || "In Progress".equals(mo.getStatus())) {
                boolean allWorkOrdersCompleted = true;
                boolean anyWorkOrderRunning = false;
                WorkOrder nextToStart = null;
                WorkOrder runningWo = null;

                if (mo.getWorkOrders() != null) {
                    for (WorkOrder wo : mo.getWorkOrders()) {
                        if (!"Completed".equals(wo.getStatus())) {
                            allWorkOrdersCompleted = false;
                        }
                        if ("Started".equals(wo.getStatus())) {
                            anyWorkOrderRunning = true;
                            runningWo = wo;
                        }
                        if ("Pending".equals(wo.getStatus()) && nextToStart == null) {
                            nextToStart = wo;
                        }
                    }
                }

                if (allWorkOrdersCompleted) {
                    try {
                        manufacturingOrderService.completeOrder(mo.getId());
                    } catch (Exception e) {
                        // Ignore
                    }
                } else if (anyWorkOrderRunning && runningWo != null) {
                    try {
                        manufacturingOrderService.setWorkOrderStatus(mo.getId(), runningWo.getId(), "Completed", "system");
                    } catch (Exception e) {
                        // Ignore
                    }
                } else if (nextToStart != null) {
                    try {
                        manufacturingOrderService.setWorkOrderStatus(mo.getId(), nextToStart.getId(), "Started", "system");
                    } catch (Exception e) {
                        // Ignore
                    }
                }
            }
        }
    }

    private void processSalesOrdersSimulation() {
        List<SalesOrder> orders = salesOrderRepository.findAll();
        for (SalesOrder so : orders) {
            if ("Confirmed".equals(so.getStatus()) || "Partially Delivered".equals(so.getStatus())) {
                Map<String, Integer> deliveries = new HashMap<>();
                boolean hasDeliveries = false;
                for (SalesOrderLine line : so.getLines()) {
                    int remaining = line.getQty() - line.getDeliveredQty();
                    if (remaining > 0) {
                        int deliverable = Math.min(remaining, line.getReservedQty());
                        if (deliverable > 0) {
                            deliveries.put(line.getId(), deliverable);
                            hasDeliveries = true;
                        }
                    }
                }
                if (hasDeliveries) {
                    try {
                        salesOrderService.deliverOrder(so.getId(), deliveries);
                    } catch (Exception e) {
                        // Ignore
                    }
                }
            }
        }
    }
}

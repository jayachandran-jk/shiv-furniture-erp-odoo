package com.shiv.erp.service;

import com.shiv.erp.model.Product;
import com.shiv.erp.model.StockLedger;
import com.shiv.erp.repository.ProductRepository;
import com.shiv.erp.repository.StockLedgerRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.util.HashSet;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
public class StockLedgerService {

    private final ProductRepository productRepository;
    private final StockLedgerRepository stockLedgerRepository;
    private final ProcurementService procurementService;

    public StockLedgerService(ProductRepository productRepository,
                              StockLedgerRepository stockLedgerRepository,
                              @Lazy ProcurementService procurementService) {
        this.productRepository = productRepository;
        this.stockLedgerRepository = stockLedgerRepository;
        this.procurementService = procurementService;
    }

    @Transactional
    public void recordMovement(String productId, String movementType, int qty, String referenceType, String referenceId, String notes) {
        executeMovement(productId, movementType, qty, referenceType, referenceId, notes);
    }

    @Transactional
    public void executeMovement(String productId, String movementType, int quantity, String referenceType, String referenceId, String notes) {
        Product product = productRepository.findByIdForUpdate(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));

        int oldOnHand = product.getOnHandQty();
        int oldReserved = product.getReservedQty();

        switch (movementType.toUpperCase()) {
            case "SALES_RESERVE":
            case "MFG_RESERVE":
                product.setReservedQty(oldReserved + quantity);
                break;
            case "SHORTAGE_DETECTED":
                // No change to stock levels for shortage logs
                break;
            case "SALES_DELIVERY":
            case "MFG_CONSUME":
                product.setOnHandQty(oldOnHand - quantity);
                product.setReservedQty(Math.max(0, oldReserved - quantity));
                break;
            case "SALES_CANCEL":
            case "MFG_CANCEL":
                product.setReservedQty(Math.max(0, oldReserved - quantity));
                break;
            case "PURCHASE_RECEIPT":
            case "MFG_PRODUCE":
                product.setOnHandQty(oldOnHand + quantity);
                break;
            case "STOCK_ADJUST":
                product.setOnHandQty(oldOnHand + quantity);
                break;
            default:
                throw new IllegalArgumentException("Unknown movement type: " + movementType);
        }

        productRepository.save(product);

        StockLedger ledger = StockLedger.builder()
                .id("sl-" + UUID.randomUUID().toString().substring(0, 8))
                .productId(productId)
                .movementType(movementType)
                .quantity(quantity)
                .onHandAfter(product.getOnHandQty())
                .reservedAfter(product.getReservedQty())
                .referenceType(referenceType)
                .referenceId(referenceId)
                .notes(notes)
                .build();
        stockLedgerRepository.save(ledger);

        // Schedule procurement check after transaction commits, to avoid lock contention
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    CompletableFuture.runAsync(() -> {
                        try {
                            procurementService.checkAndTriggerProcurement(productId, movementType, referenceId, null, new HashSet<>(), 0);
                        } catch (Exception e) {
                            // log error or ignore
                        }
                    });
                }
            });
        } else {
            CompletableFuture.runAsync(() -> {
                try {
                    procurementService.checkAndTriggerProcurement(productId, movementType, referenceId, null, new HashSet<>(), 0);
                } catch (Exception e) {
                    // log error or ignore
                }
            });
        }
    }
}

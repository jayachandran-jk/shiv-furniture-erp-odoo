package com.shiv.erp.controller;

import com.shiv.erp.model.Product;
import com.shiv.erp.model.StockLedger;
import com.shiv.erp.repository.ProductRepository;
import com.shiv.erp.repository.StockLedgerRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final StockLedgerRepository stockLedgerRepository;
    private final ProductRepository productRepository;

    public InventoryController(StockLedgerRepository stockLedgerRepository, ProductRepository productRepository) {
        this.stockLedgerRepository = stockLedgerRepository;
        this.productRepository = productRepository;
    }

    @GetMapping
    public ResponseEntity<List<StockLedger>> getStockLedger(
            @RequestParam(required = false) String productId,
            @RequestParam(required = false) String movementType
    ) {
        List<StockLedger> entries;
        if (productId != null && !productId.isEmpty() && movementType != null && !movementType.isEmpty()) {
            entries = stockLedgerRepository.findByProductIdAndMovementType(productId, movementType);
        } else if (productId != null && !productId.isEmpty()) {
            entries = stockLedgerRepository.findByProductId(productId);
        } else if (movementType != null && !movementType.isEmpty()) {
            entries = stockLedgerRepository.findByMovementType(movementType);
        } else {
            entries = stockLedgerRepository.findAll();
        }
        
        // Sort by timestamp descending
        entries.sort((a, b) -> b.getTs() == null ? 0 : b.getTs().compareTo(a.getTs() == null ? b.getTs() : a.getTs()));
        return ResponseEntity.ok(entries);
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<Product>> getLowStockProducts() {
        List<Product> products = productRepository.findAll();
        
        List<Product> lowStock = products.stream()
                .filter(p -> p.getReorderThreshold() > 0 && (p.getOnHandQty() - p.getReservedQty()) <= p.getReorderThreshold())
                .sorted((a, b) -> {
                    int gapA = a.getReorderThreshold() - (a.getOnHandQty() - a.getReservedQty());
                    int gapB = b.getReorderThreshold() - (b.getOnHandQty() - b.getReservedQty());
                    return Integer.compare(gapB, gapA); // Descending order of shortfall severity
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(lowStock);
    }
}

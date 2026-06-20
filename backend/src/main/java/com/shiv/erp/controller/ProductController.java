package com.shiv.erp.controller;

import com.shiv.erp.model.Product;
import com.shiv.erp.model.StockLedger;
import com.shiv.erp.model.BoM;
import com.shiv.erp.model.BomComponent;
import com.shiv.erp.repository.ProductRepository;
import com.shiv.erp.repository.StockLedgerRepository;
import com.shiv.erp.repository.BoMRepository;
import com.shiv.erp.service.AuditLogService;
import com.shiv.erp.service.ProcurementService;
import com.shiv.erp.utils.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository productRepository;
    private final StockLedgerRepository stockLedgerRepository;
    private final AuditLogService auditLogService;
    private final BoMRepository bomRepository;
    private final ProcurementService procurementService;

    public ProductController(ProductRepository productRepository,
                             StockLedgerRepository stockLedgerRepository,
                             AuditLogService auditLogService,
                             BoMRepository bomRepository,
                             ProcurementService procurementService) {
        this.productRepository = productRepository;
        this.stockLedgerRepository = stockLedgerRepository;
        this.auditLogService = auditLogService;
        this.bomRepository = bomRepository;
        this.procurementService = procurementService;
    }

    @GetMapping
    public ResponseEntity<List<Product>> getProducts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String strategy
    ) {
        List<Product> products = productRepository.findAllByOrderByUpdatedAtDesc();

        if (search != null && !search.trim().isEmpty()) {
            String q = search.trim().toLowerCase();
            products = products.stream()
                    .filter(p -> p.getName().toLowerCase().contains(q) || p.getSku().toLowerCase().contains(q))
                    .collect(Collectors.toList());
        }

        if (category != null && !category.trim().isEmpty()) {
            products = products.stream()
                    .filter(p -> p.getCategory().equalsIgnoreCase(category.trim()))
                    .collect(Collectors.toList());
        }

        if (strategy != null && !strategy.trim().isEmpty()) {
            products = products.stream()
                    .filter(p -> p.getStrategy().equalsIgnoreCase(strategy.trim()))
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(products);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProductDetail(@PathVariable String id) {
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Product not found"));
        }

        List<StockLedger> ledger = stockLedgerRepository.findTop10ByProductIdOrderByTsDesc(id);

        Map<String, Object> response = new HashMap<>();
        response.put("product", product);
        response.put("ledger", ledger);

        return ResponseEntity.ok(response);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','OWNER')")
    public ResponseEntity<?> createProduct(@Valid @RequestBody Product product) {
        if (product.getId() == null || product.getId().isEmpty()) {
            product.setId("p-" + UUID.randomUUID().toString().substring(0, 8));
        }

        if (productRepository.findById(product.getId()).isPresent() || 
            (product.getSku() != null && productRepository.findAllByOrderByUpdatedAtDesc().stream().anyMatch(p -> p.getSku().equalsIgnoreCase(product.getSku())))) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Product ID or SKU is already in use"));
        }

        Product saved = productRepository.save(product);

        // Auto-create BoM if procurementType is Manufacturing and components are specified
        if ("Manufacturing".equalsIgnoreCase(saved.getProcurementType()) && 
            product.getComponents() != null && !product.getComponents().isEmpty()) {
            
            BoM bom = new BoM();
            String bomId = "bom-" + UUID.randomUUID().toString().substring(0, 8);
            bom.setId(bomId);
            
            String ref = procurementService.generateNextNumber("BOM", bomRepository.findFirstByOrderByBomReferenceDesc().map(BoM::getBomReference));
            bom.setBomReference(ref);
            bom.setProductId(saved.getId());
            bom.setQtyProduced(1.0);
            bom.setVersion(1);
            bom.setIsActive(true);
            bom.setNotes(saved.getName() + " - Default BoM");
            bom.setCreatedBy(SecurityUtils.getCurrentUserId());
            
            List<BomComponent> bomComponents = new java.util.ArrayList<>();
            for (BomComponent bc : product.getComponents()) {
                bc.setId("bc-" + UUID.randomUUID().toString().substring(0, 8));
                bc.setBomId(bomId);
                bomComponents.add(bc);
            }
            bom.setComponents(bomComponents);
            bom.setOperations(new java.util.ArrayList<>());
            
            BoM savedBom = bomRepository.save(bom);
            
            saved.setBomId(savedBom.getId());
            saved = productRepository.save(saved);
        }

        auditLogService.logChange(
                SecurityUtils.getCurrentUserId(),
                "Product",
                saved.getId(),
                "Created",
                null,
                String.format("{\"sku\": \"%s\", \"name\": \"%s\"}", saved.getSku(), saved.getName())
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OWNER')")
    public ResponseEntity<?> updateProduct(@PathVariable String id, @Valid @RequestBody Product patch) {
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Product not found"));
        }

        String oldValStr = String.format("{\"sku\": \"%s\", \"name\": \"%s\", \"costPrice\": %s, \"salePrice\": %s}",
                product.getSku(), product.getName(), product.getCostPrice(), product.getSalePrice());

        product.setSku(patch.getSku());
        product.setName(patch.getName());
        product.setCategory(patch.getCategory());
        product.setDescription(patch.getDescription());
        product.setCostPrice(patch.getCostPrice());
        product.setSalePrice(patch.getSalePrice());
        product.setStrategy(patch.getStrategy());
        product.setProcurementType(patch.getProcurementType());
        product.setPreferredVendorId(patch.getPreferredVendorId());
        product.setBomId(patch.getBomId());
        product.setReorderThreshold(patch.getReorderThreshold());

        Product saved = productRepository.save(product);

        String newValStr = String.format("{\"sku\": \"%s\", \"name\": \"%s\", \"costPrice\": %s, \"salePrice\": %s}",
                saved.getSku(), saved.getName(), saved.getCostPrice(), saved.getSalePrice());

        auditLogService.logChange(
                SecurityUtils.getCurrentUserId(),
                "Product",
                saved.getId(),
                "Updated",
                oldValStr,
                newValStr
        );

        return ResponseEntity.ok(saved);
    }
}

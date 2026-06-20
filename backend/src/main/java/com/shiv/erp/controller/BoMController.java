package com.shiv.erp.controller;

import com.shiv.erp.model.BoM;
import com.shiv.erp.model.BomComponent;
import com.shiv.erp.model.BomOperation;
import com.shiv.erp.model.Product;
import com.shiv.erp.model.WorkCenter;
import com.shiv.erp.repository.BoMRepository;
import com.shiv.erp.repository.ProductRepository;
import com.shiv.erp.repository.WorkCenterRepository;
import com.shiv.erp.service.BoMService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/boms")
public class BoMController {

    private final BoMRepository bomRepository;
    private final BoMService bomService;
    private final ProductRepository productRepository;
    private final WorkCenterRepository workCenterRepository;

    public BoMController(BoMRepository bomRepository,
                         BoMService bomService,
                         ProductRepository productRepository,
                         WorkCenterRepository workCenterRepository) {
        this.bomRepository = bomRepository;
        this.bomService = bomService;
        this.productRepository = productRepository;
        this.workCenterRepository = workCenterRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATIONS','OWNER','MANUFACTURING')")
    public ResponseEntity<List<BoM>> getAllBoms(
            @RequestParam(required = false) String productId,
            @RequestParam(required = false) Boolean isActive
    ) {
        List<BoM> boms = bomRepository.findAll();

        if (productId != null && !productId.isEmpty()) {
            boms = boms.stream()
                    .filter(b -> b.getProductId().equals(productId))
                    .collect(Collectors.toList());
        }

        if (isActive != null) {
            boms = boms.stream()
                    .filter(b -> b.getIsActive().equals(isActive))
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(boms);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATIONS','OWNER','MANUFACTURING')")
    public ResponseEntity<BoM> getBomDetail(@PathVariable String id) {
        BoM bom = bomRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bill of Materials not found"));
        return ResponseEntity.ok(bom);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATIONS','MANUFACTURING')")
    public ResponseEntity<BoM> createBom(@RequestBody BoM bom) {
        BoM created = bomService.createBom(bom);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATIONS','MANUFACTURING')")
    public ResponseEntity<BoM> updateBom(@PathVariable String id, @RequestBody BoM bom) {
        BoM updated = bomService.updateBom(id, bom);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATIONS','MANUFACTURING')")
    public ResponseEntity<Void> deactivateBom(@PathVariable String id) {
        bomService.deactivateBom(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/by-product/{productId}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATIONS','OWNER','MANUFACTURING')")
    public ResponseEntity<?> getBomByProduct(@PathVariable String productId) {
        BoM bom = bomRepository.findByProductIdAndIsActiveTrue(productId).orElse(null);
        if (bom == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "No active BoM found for this product"));
        }

        // Map components with product details and stock status
        List<Map<String, Object>> componentsMapped = new ArrayList<>();
        if (bom.getComponents() != null) {
            for (BomComponent bc : bom.getComponents()) {
                Product compProd = productRepository.findById(bc.getProductId()).orElse(null);
                String compName = compProd != null ? compProd.getName() : "Unknown Product";
                double freeToUse = compProd != null ? (compProd.getOnHandQty() - compProd.getReservedQty()) : 0.0;

                Map<String, Object> cMap = new HashMap<>();
                cMap.put("id", bc.getId());
                cMap.put("componentProductId", bc.getProductId());
                cMap.put("componentProductName", compName);
                cMap.put("qtyRequired", bc.getQty());
                cMap.put("unitOfMeasure", bc.getUnitOfMeasure());
                cMap.put("currentFreeToUseQty", freeToUse);
                componentsMapped.add(cMap);
            }
        }

        // Map operations with work center name
        List<Map<String, Object>> operationsMapped = new ArrayList<>();
        if (bom.getOperations() != null) {
            for (BomOperation bo : bom.getOperations()) {
                WorkCenter wc = null;
                if (bo.getWorkCenterId() != null) {
                    wc = workCenterRepository.findById(bo.getWorkCenterId()).orElse(null);
                }
                String wcName = wc != null ? wc.getName() : "Unknown Work Center";

                Map<String, Object> oMap = new HashMap<>();
                oMap.put("id", bo.getId());
                oMap.put("sequence", bo.getSequence());
                oMap.put("operationName", bo.getName());
                oMap.put("workCenterId", bo.getWorkCenterId());
                oMap.put("workCenterName", wcName);
                oMap.put("durationMinutes", bo.getDurationMinutes());
                operationsMapped.add(oMap);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("bomId", bom.getId());
        response.put("bomReference", bom.getBomReference());
        response.put("qtyProduced", bom.getQtyProduced());
        response.put("components", componentsMapped);
        response.put("operations", operationsMapped);

        return ResponseEntity.ok(response);
    }
}

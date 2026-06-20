package com.shiv.erp.service;

import com.shiv.erp.model.BoM;
import com.shiv.erp.model.BomComponent;
import com.shiv.erp.model.BomOperation;
import com.shiv.erp.model.Product;
import com.shiv.erp.repository.BoMRepository;
import com.shiv.erp.repository.ProductRepository;
import com.shiv.erp.repository.BomOperationRepository;
import com.shiv.erp.utils.SecurityUtils;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

@Service
public class BoMService {

    private final BoMRepository bomRepository;
    private final BomOperationRepository bomOperationRepository;
    private final ProcurementService procurementService;
    private final AuditLogService auditLogService;
    private final ProductRepository productRepository;

    public BoMService(BoMRepository bomRepository,
                      BomOperationRepository bomOperationRepository,
                      ProcurementService procurementService,
                      AuditLogService auditLogService,
                      ProductRepository productRepository) {
        this.bomRepository = bomRepository;
        this.bomOperationRepository = bomOperationRepository;
        this.procurementService = procurementService;
        this.auditLogService = auditLogService;
        this.productRepository = productRepository;
    }

    @Transactional
    public BoM createBom(BoM bom) {
        // Validate circular dependency
        if (bom.getComponents() != null) {
            for (BomComponent bc : bom.getComponents()) {
                if (bc.getProductId().equals(bom.getProductId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A product cannot be a component of itself.");
                }
            }
        }

        // Validate single active BoM per product
        if (Boolean.TRUE.equals(bom.getIsActive())) {
            Optional<BoM> existing = bomRepository.findByProductIdAndIsActiveTrue(bom.getProductId());
            if (existing.isPresent()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product already has an active BoM. Deactivate it first or create a new version.");
            }
        }

        // Generate ID
        String bomId = "bom-" + UUID.randomUUID().toString().substring(0, 8);
        bom.setId(bomId);

        // Generate Reference
        String ref = procurementService.generateNextNumber("BOM", bomRepository.findFirstByOrderByBomReferenceDesc().map(BoM::getBomReference));
        bom.setBomReference(ref);

        String currentUserId = SecurityUtils.getCurrentUserId();
        bom.setCreatedBy(currentUserId);

        // Sub-entities IDs and keys setup
        if (bom.getComponents() != null) {
            for (BomComponent bc : bom.getComponents()) {
                bc.setId("bc-" + UUID.randomUUID().toString().substring(0, 8));
                bc.setBomId(bomId);
            }
        }

        if (bom.getOperations() != null) {
            int seq = 10;
            for (BomOperation bo : bom.getOperations()) {
                bo.setId("bo-" + UUID.randomUUID().toString().substring(0, 8));
                bo.setBomId(bomId);
                if (bo.getSequence() == null || bo.getSequence() == 0) {
                    bo.setSequence(seq);
                    seq += 10;
                }
            }
        }

        BoM saved = bomRepository.save(bom);

        Product product = productRepository.findById(saved.getProductId()).orElse(null);
        String productName = product != null ? product.getName() : saved.getProductId();

        auditLogService.logChange(
                currentUserId,
                "BILL_OF_MATERIALS",
                saved.getId(),
                "Created",
                null,
                String.format("{\"bomReference\": \"%s\", \"finishedProductId\": \"%s\", \"finishedProductName\": \"%s\"}", saved.getBomReference(), saved.getProductId(), productName)
        );

        return saved;
    }

    @Transactional
    public BoM updateBom(String id, BoM patch) {
        BoM bom = bomRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bill of Materials not found"));

        // Validate circular dependency
        if (patch.getComponents() != null) {
            for (BomComponent bc : patch.getComponents()) {
                if (bc.getProductId().equals(bom.getProductId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A product cannot be a component of itself.");
                }
            }
        }

        // Validate single active BoM per product
        if (Boolean.TRUE.equals(patch.getIsActive()) && !Boolean.TRUE.equals(bom.getIsActive())) {
            Optional<BoM> existing = bomRepository.findByProductIdAndIsActiveTrue(bom.getProductId());
            if (existing.isPresent() && !existing.get().getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product already has an active BoM. Deactivate it first or create a new version.");
            }
        }

        String currentUserId = SecurityUtils.getCurrentUserId();
        String oldVal = String.format("{\"isActive\": %b, \"qtyProduced\": %s}", bom.getIsActive(), bom.getQtyProduced());

        bom.setQtyProduced(patch.getQtyProduced());
        bom.setVersion(patch.getVersion());
        bom.setIsActive(patch.getIsActive());
        bom.setNotes(patch.getNotes());

        // Update components
        bom.getComponents().clear();
        if (patch.getComponents() != null) {
            for (BomComponent bc : patch.getComponents()) {
                bc.setId("bc-" + UUID.randomUUID().toString().substring(0, 8));
                bc.setBomId(id);
                bom.getComponents().add(bc);
            }
        }

        // Update operations
        bom.getOperations().clear();
        if (patch.getOperations() != null) {
            for (BomOperation bo : patch.getOperations()) {
                bo.setId("bo-" + UUID.randomUUID().toString().substring(0, 8));
                bo.setBomId(id);
                if (bo.getSequence() == null || bo.getSequence() == 0) {
                    int lastSeq = bom.getOperations().stream()
                            .mapToInt(BomOperation::getSequence)
                            .max()
                            .orElse(0);
                    bo.setSequence(lastSeq + 10);
                }
                bom.getOperations().add(bo);
            }
        }

        BoM saved = bomRepository.save(bom);

        Product product = productRepository.findById(bom.getProductId()).orElse(null);
        String productName = product != null ? product.getName() : bom.getProductId();
        String newVal = String.format("{\"isActive\": %b, \"qtyProduced\": %s, \"finishedProductName\": \"%s\"}", saved.getIsActive(), saved.getQtyProduced(), productName);

        auditLogService.logChange(
                currentUserId,
                "BILL_OF_MATERIALS",
                saved.getId(),
                "Updated",
                oldVal,
                newVal
        );

        return saved;
    }

    @Transactional
    public void deactivateBom(String id) {
        BoM bom = bomRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bill of Materials not found"));

        if (Boolean.TRUE.equals(bom.getIsActive())) {
            bom.setIsActive(false);
            bomRepository.save(bom);

            auditLogService.logChange(
                    SecurityUtils.getCurrentUserId(),
                    "BILL_OF_MATERIALS",
                    id,
                    "Deactivated",
                    "{\"isActive\": true}",
                    "{\"isActive\": false}"
            );
        }
    }
}

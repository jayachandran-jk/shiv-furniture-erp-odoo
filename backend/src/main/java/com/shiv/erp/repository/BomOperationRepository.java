package com.shiv.erp.repository;

import com.shiv.erp.model.BomOperation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BomOperationRepository extends JpaRepository<BomOperation, String> {
    List<BomOperation> findByBomId(String bomId);
}

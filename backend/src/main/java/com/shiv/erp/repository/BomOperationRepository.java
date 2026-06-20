package com.shiv.erp.repository;

import com.shiv.erp.model.BomOperation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface BomOperationRepository extends JpaRepository<BomOperation, String> {
    List<BomOperation> findByBomId(String bomId);

    @Query("SELECT COALESCE(MAX(o.sequence), 0) FROM BomOperation o WHERE o.bomId = :bomId")
    int findMaxSequenceByBomId(@Param("bomId") String bomId);
}

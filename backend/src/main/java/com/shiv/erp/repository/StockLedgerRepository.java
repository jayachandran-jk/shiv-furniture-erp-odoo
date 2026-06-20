package com.shiv.erp.repository;

import com.shiv.erp.model.StockLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StockLedgerRepository extends JpaRepository<StockLedger, String> {
    List<StockLedger> findTop10ByProductIdOrderByTsDesc(String productId);
    List<StockLedger> findByProductId(String productId);
    List<StockLedger> findByMovementType(String movementType);
    List<StockLedger> findByProductIdAndMovementType(String productId, String movementType);
}

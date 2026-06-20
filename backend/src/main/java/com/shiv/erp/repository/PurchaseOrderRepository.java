package com.shiv.erp.repository;

import com.shiv.erp.model.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, String> {
    Optional<PurchaseOrder> findFirstByOrderByNumberDesc();
}

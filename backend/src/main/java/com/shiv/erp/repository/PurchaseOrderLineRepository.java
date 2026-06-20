package com.shiv.erp.repository;

import com.shiv.erp.model.PurchaseOrderLine;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseOrderLineRepository extends JpaRepository<PurchaseOrderLine, String> {
}

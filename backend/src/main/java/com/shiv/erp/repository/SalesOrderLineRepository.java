package com.shiv.erp.repository;

import com.shiv.erp.model.SalesOrderLine;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesOrderLineRepository extends JpaRepository<SalesOrderLine, String> {
}

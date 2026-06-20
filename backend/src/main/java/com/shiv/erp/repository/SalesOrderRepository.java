package com.shiv.erp.repository;

import com.shiv.erp.model.SalesOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SalesOrderRepository extends JpaRepository<SalesOrder, String> {
    Optional<SalesOrder> findFirstByOrderByNumberDesc();
}

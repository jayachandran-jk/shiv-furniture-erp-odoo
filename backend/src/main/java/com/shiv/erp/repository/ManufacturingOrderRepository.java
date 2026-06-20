package com.shiv.erp.repository;

import com.shiv.erp.model.ManufacturingOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ManufacturingOrderRepository extends JpaRepository<ManufacturingOrder, String> {
    Optional<ManufacturingOrder> findFirstByOrderByNumberDesc();
}

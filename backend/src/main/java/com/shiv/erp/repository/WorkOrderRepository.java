package com.shiv.erp.repository;

import com.shiv.erp.model.WorkOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WorkOrderRepository extends JpaRepository<WorkOrder, String> {
    List<WorkOrder> findByMoId(String moId);
}

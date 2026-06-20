package com.shiv.erp.repository;

import com.shiv.erp.model.BomComponent;
import com.shiv.erp.model.BomComponentId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BomComponentRepository extends JpaRepository<BomComponent, BomComponentId> {
    List<BomComponent> findByBomId(String bomId);
}

package com.shiv.erp.repository;

import com.shiv.erp.model.BomComponent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BomComponentRepository extends JpaRepository<BomComponent, String> {
    List<BomComponent> findByBomId(String bomId);
}

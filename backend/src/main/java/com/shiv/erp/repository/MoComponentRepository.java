package com.shiv.erp.repository;

import com.shiv.erp.model.MoComponent;
import com.shiv.erp.model.MoComponentId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MoComponentRepository extends JpaRepository<MoComponent, MoComponentId> {
}

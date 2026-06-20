package com.shiv.erp.repository;

import com.shiv.erp.model.BoM;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface BoMRepository extends JpaRepository<BoM, String> {
    Optional<BoM> findByProductId(String productId);
    Optional<BoM> findByProductIdAndIsActiveTrue(String productId);
    Optional<BoM> findFirstByOrderByBomReferenceDesc();
    java.util.List<BoM> findAllByOrderByUpdatedAtDesc();
}

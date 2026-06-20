package com.shiv.erp.repository;

import com.shiv.erp.model.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") String id);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.onHandQty < p.reorderThreshold AND p.reorderThreshold > 0")
    long countActiveShortages();
}

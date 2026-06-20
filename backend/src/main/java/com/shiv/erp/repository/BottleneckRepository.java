package com.shiv.erp.repository;

import com.shiv.erp.model.Bottleneck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BottleneckRepository extends JpaRepository<Bottleneck, String> {
    List<Bottleneck> findByStatus(String status);
    List<Bottleneck> findByStatusAndStage(String status, String stage);
    Optional<Bottleneck> findByTypeAndRecordIdAndStatus(String type, String recordId, String status);
}

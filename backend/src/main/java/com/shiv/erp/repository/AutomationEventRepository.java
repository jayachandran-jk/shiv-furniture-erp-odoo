package com.shiv.erp.repository;

import com.shiv.erp.model.AutomationEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface AutomationEventRepository extends JpaRepository<AutomationEvent, String> {

    Page<AutomationEvent> findAllByOrderByTsDesc(Pageable pageable);

    List<AutomationEvent> findByParentEventIdOrderByTsAsc(String parentEventId);

    @Query("SELECT ae FROM AutomationEvent ae WHERE ae.parentEventId IS NULL ORDER BY ae.ts DESC")
    List<AutomationEvent> findRootEventsOrderByTsDesc();

    long countByActionTakenIn(List<String> actions);

    long countByStatus(String status);

    @Query("SELECT COUNT(ae) FROM AutomationEvent ae WHERE ae.status = 'SUCCESS'")
    long countSuccessful();

    @Query("SELECT COUNT(ae) FROM AutomationEvent ae WHERE ae.status = 'FAILED'")
    long countFailed();
}

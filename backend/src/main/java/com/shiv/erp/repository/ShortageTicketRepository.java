package com.shiv.erp.repository;

import com.shiv.erp.model.ShortageTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ShortageTicketRepository extends JpaRepository<ShortageTicket, String> {
    List<ShortageTicket> findByMoId(String moId);
    List<ShortageTicket> findByPoId(String poId);
}

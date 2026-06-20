package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "automation_events")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutomationEvent {
    @Id
    @Column(length = 50)
    private String id;

    @Column(insertable = false, updatable = false)
    private LocalDateTime ts;

    @Column(name = "trigger_type", length = 50)
    private String triggerType; // SALES_CONFIRM, STOCK_CHANGE, MO_COMPLETE, PO_RECEIVE, etc.

    @Column(name = "trigger_entity_id", length = 50)
    private String triggerEntityId;

    @Column(name = "product_id", length = 50)
    private String productId;

    @Column(name = "product_sku", length = 100)
    private String productSku;

    @Column(name = "available_qty")
    private Integer availableQty;

    @Column(name = "required_qty")
    private Integer requiredQty;

    @Column(name = "shortage_qty")
    private Integer shortageQty;

    @Column(name = "action_taken", length = 50)
    private String actionTaken; // PO_CREATED, PO_UPDATED, MO_CREATED, MO_UPDATED, NO_ACTION, SKIPPED

    @Column(name = "generated_doc_id", length = 50)
    private String generatedDocId;

    @Column(name = "generated_doc_number", length = 100)
    private String generatedDocNumber;

    @Column(length = 20)
    @Builder.Default
    private String status = "SUCCESS"; // SUCCESS, FAILED, SKIPPED

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "parent_event_id", length = 50)
    private String parentEventId;
}

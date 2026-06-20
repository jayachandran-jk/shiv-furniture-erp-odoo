package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "bottlenecks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bottleneck {
    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false, length = 50)
    private String type; // SO_STUCK, INVENTORY_DELAYED, MO_NOT_STARTED, WO_OVERTIME, MO_STALLED, DELIVERY_DELAYED, STOCKOUT_RISK

    @Column(nullable = false, length = 20)
    private String severity; // Warning, Critical

    @Column(nullable = false)
    private String title;

    @Column(name = "record_id", length = 50)
    private String recordId;

    @Column(name = "record_number", length = 100)
    private String recordNumber;

    @Column(nullable = false, length = 50)
    private String stage; // Sales, Inventory, Manufacturing, Delivery

    @Column(name = "time_detail", length = 100)
    private String timeDetail;

    @Column(columnDefinition = "TEXT")
    private String impact;

    @Column(name = "suggested_action", columnDefinition = "TEXT")
    private String suggestedAction;

    @Column(name = "detected_at")
    private LocalDateTime detectedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "is_dismissed")
    @Builder.Default
    private Boolean isDismissed = false;

    @Column(name = "dismissed_at")
    private LocalDateTime dismissedAt;

    @Column(name = "dismissed_by", length = 100)
    private String dismissedBy;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, RESOLVED, DISMISSED
}

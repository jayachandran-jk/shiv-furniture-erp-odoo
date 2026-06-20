package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "sales_orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesOrder {
    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false, unique = true, length = 100)
    private String number;

    @Column(name = "customer_id", length = 50)
    private String customerId;

    @Column(nullable = false, length = 50)
    private String status; // Draft, Confirmed, Partially Delivered, Fully Delivered, Cancelled

    @Column(name = "created_by", length = 36)
    private String createdBy;

    @Column(name = "salesperson_id", length = 36)
    private String salespersonId;

    @Column(insertable = false, updatable = false)
    private LocalDateTime date;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "sales_order_id")
    private List<SalesOrderLine> lines;

    @org.hibernate.annotations.UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

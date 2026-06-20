package com.shiv.erp.model;

import java.io.Serializable;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MoComponentId implements Serializable {
    private String moId;
    private String productId;
}

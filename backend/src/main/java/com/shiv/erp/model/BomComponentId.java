package com.shiv.erp.model;

import java.io.Serializable;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BomComponentId implements Serializable {
    private String bomId;
    private String productId;
}

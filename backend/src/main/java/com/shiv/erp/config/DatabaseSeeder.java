package com.shiv.erp.config;

import com.shiv.erp.model.*;
import com.shiv.erp.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final VendorRepository vendorRepository;
    private final CustomerRepository customerRepository;
    private final WorkCenterRepository workCenterRepository;
    private final ProductRepository productRepository;
    private final BoMRepository bomRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final ManufacturingOrderRepository manufacturingOrderRepository;
    private final StockLedgerRepository stockLedgerRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(UserRepository userRepository,
                          VendorRepository vendorRepository,
                          CustomerRepository customerRepository,
                          WorkCenterRepository workCenterRepository,
                          ProductRepository productRepository,
                          BoMRepository bomRepository,
                          SalesOrderRepository salesOrderRepository,
                          PurchaseOrderRepository purchaseOrderRepository,
                          ManufacturingOrderRepository manufacturingOrderRepository,
                          StockLedgerRepository stockLedgerRepository,
                          AuditLogRepository auditLogRepository,
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.vendorRepository = vendorRepository;
        this.customerRepository = customerRepository;
        this.workCenterRepository = workCenterRepository;
        this.productRepository = productRepository;
        this.bomRepository = bomRepository;
        this.salesOrderRepository = salesOrderRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.manufacturingOrderRepository = manufacturingOrderRepository;
        this.stockLedgerRepository = stockLedgerRepository;
        this.auditLogRepository = auditLogRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (userRepository.count() > 0) {
            return; // Seed already executed
        }

        // 1. Users (one per role)
        User u1 = User.builder().id("u-1").name("Anita Sharma").email("admin@shiv.co").role("admin").passwordHash(passwordEncoder.encode("admin")).isActive(true).build();
        User u2 = User.builder().id("u-2").name("Ravi Kumar").email("sales@shiv.co").role("sales").passwordHash(passwordEncoder.encode("sales")).isActive(true).build();
        User u3 = User.builder().id("u-3").name("Shiv Patel").email("owner@shiv.co").role("owner").passwordHash(passwordEncoder.encode("owner")).isActive(true).build();
        User u4 = User.builder().id("u-4").name("Meera Joshi").email("mfg@shiv.co").role("manufacturing").passwordHash(passwordEncoder.encode("mfg")).isActive(true).build();
        User u5 = User.builder().id("u-5").name("Priya Nair").email("purchase@shiv.co").role("purchase").passwordHash(passwordEncoder.encode("purchase")).isActive(true).build();
        User u6 = User.builder().id("u-6").name("Arjun Reddy").email("inventory@shiv.co").role("inventory").passwordHash(passwordEncoder.encode("inventory")).isActive(true).build();

        userRepository.saveAll(List.of(u1, u2, u3, u4, u5, u6));

        // 2. Vendors
        Vendor v1 = Vendor.builder().id("v-1").name("Karnataka Hardwood Co.").contact("+91 98450 12345").build();
        Vendor v2 = Vendor.builder().id("v-2").name("Bharat Fasteners").contact("+91 99876 54321").build();
        Vendor v3 = Vendor.builder().id("v-3").name("Sundaram Polish & Finish").contact("+91 90123 45678").build();

        vendorRepository.saveAll(List.of(v1, v2, v3));

        // 3. Customers
        Customer c1 = Customer.builder().id("c-1").name("Hotel Indus Bengaluru").contact("purchase@hotelindus.in").address("42 MG Road, Bengaluru, Karnataka 560001").build();
        Customer c2 = Customer.builder().id("c-2").name("Meher Residence").contact("meher.r@gmail.com").address("15 Koramangala 4th Block, Bengaluru, Karnataka 560034").build();
        Customer c3 = Customer.builder().id("c-3").name("Tata Coffee Office").contact("facilities@tatacoffee.com").address("1 Pollibetta, Kodagu, Karnataka 571215").build();
        Customer c4 = Customer.builder().id("c-4").name("Saraswati School Trust").contact("office@saraswatitrust.org").address("88 Jayanagar 9th Block, Bengaluru, Karnataka 560069").build();

        customerRepository.saveAll(List.of(c1, c2, c3, c4));

        // 4. Work Centers
        WorkCenter wc1 = WorkCenter.builder().id("wc-1").name("Cutting Bay").build();
        WorkCenter wc2 = WorkCenter.builder().id("wc-2").name("Assembly Line A").build();
        WorkCenter wc3 = WorkCenter.builder().id("wc-3").name("Sanding Booth").build();
        WorkCenter wc4 = WorkCenter.builder().id("wc-4").name("Polish & Finish").build();

        workCenterRepository.saveAll(List.of(wc1, wc2, wc3, wc4));

        // 5. Products (temporary bomId to avoid cyclic dependency, we will set them later)
        Product pW1 = Product.builder().id("p-w1").sku("RAW-TEAK-PLK").name("Teak Plank 6ft").category("Raw Material").costPrice(new BigDecimal("1200.00")).salePrice(BigDecimal.ZERO).strategy("MTS").procurementType("Purchase").preferredVendorId("v-1").reorderThreshold(20).onHandQty(84).reservedQty(0).build();
        Product pW2 = Product.builder().id("p-w2").sku("RAW-PLY-18").name("Plywood Sheet 18mm").category("Raw Material").costPrice(new BigDecimal("850.00")).salePrice(BigDecimal.ZERO).strategy("MTS").procurementType("Purchase").preferredVendorId("v-1").reorderThreshold(30).onHandQty(12).reservedQty(0).build();
        Product pW3 = Product.builder().id("p-w3").sku("RAW-SCRW-50").name("Wood Screw 50mm (pack)").category("Hardware").costPrice(new BigDecimal("180.00")).salePrice(BigDecimal.ZERO).strategy("MTS").procurementType("Purchase").preferredVendorId("v-2").reorderThreshold(25).onHandQty(110).reservedQty(0).build();
        Product pW4 = Product.builder().id("p-w4").sku("RAW-VARN-1L").name("Walnut Varnish 1L").category("Finishing").costPrice(new BigDecimal("620.00")).salePrice(BigDecimal.ZERO).strategy("MTS").procurementType("Purchase").preferredVendorId("v-3").reorderThreshold(10).onHandQty(8).reservedQty(0).build();
        Product pW5 = Product.builder().id("p-w5").sku("RAW-LEG-OAK").name("Oak Leg Blank").category("Raw Material").costPrice(new BigDecimal("320.00")).salePrice(BigDecimal.ZERO).strategy("MTS").procurementType("Purchase").preferredVendorId("v-1").reorderThreshold(40).onHandQty(96).reservedQty(0).build();

        Product pF1 = Product.builder().id("p-f1").sku("FG-DINTBL-6").name("Heritage Dining Table (6-seat)").category("Dining").costPrice(BigDecimal.ZERO).salePrice(new BigDecimal("38500.00")).strategy("MTO").procurementType("Manufacturing").reorderThreshold(0).onHandQty(2).reservedQty(0).bomId("bom-1").build();
        Product pF2 = Product.builder().id("p-f2").sku("FG-OFFCHR").name("Walnut Office Chair").category("Office").costPrice(BigDecimal.ZERO).salePrice(new BigDecimal("9200.00")).strategy("MTS").procurementType("Manufacturing").reorderThreshold(5).onHandQty(14).reservedQty(11).bomId("bom-2").build();
        Product pF3 = Product.builder().id("p-f3").sku("FG-BKSHLF-5").name("5-Tier Bookshelf").category("Living Room").costPrice(BigDecimal.ZERO).salePrice(new BigDecimal("14800.00")).strategy("MTO").procurementType("Manufacturing").reorderThreshold(0).onHandQty(4).reservedQty(2).bomId("bom-3").build();
        Product pF4 = Product.builder().id("p-f4").sku("FG-STUDENTDESK").name("Student Study Desk").category("Office").costPrice(BigDecimal.ZERO).salePrice(new BigDecimal("6400.00")).strategy("MTS").procurementType("Manufacturing").reorderThreshold(10).onHandQty(22).reservedQty(4).bomId("bom-4").build();

        productRepository.saveAll(List.of(pW1, pW2, pW3, pW4, pW5, pF1, pF2, pF3, pF4));

        // 6. BoMs
        BoM bom1 = BoM.builder().id("bom-1").bomReference("BOM-000001").productId("p-f1").qtyProduced(1.0).version(1).isActive(true).build();
        bom1.setComponents(List.of(
                BomComponent.builder().id("bc-1").bomId("bom-1").productId("p-w1").qty(3.0).unitOfMeasure("pcs").build(),
                BomComponent.builder().id("bc-2").bomId("bom-1").productId("p-w5").qty(4.0).unitOfMeasure("pcs").build(),
                BomComponent.builder().id("bc-3").bomId("bom-1").productId("p-w3").qty(1.0).unitOfMeasure("pcs").build(),
                BomComponent.builder().id("bc-4").bomId("bom-1").productId("p-w4").qty(1.0).unitOfMeasure("pcs").build()
        ));
        bom1.setOperations(List.of(
                BomOperation.builder().id("op-1").bomId("bom-1").sequence(10).name("Cut planks to size").workCenterId("wc-1").durationMinutes(90).build(),
                BomOperation.builder().id("op-2").bomId("bom-1").sequence(20).name("Sand all surfaces").workCenterId("wc-3").durationMinutes(60).build(),
                BomOperation.builder().id("op-3").bomId("bom-1").sequence(30).name("Assemble table").workCenterId("wc-2").durationMinutes(120).build(),
                BomOperation.builder().id("op-4").bomId("bom-1").sequence(40).name("Apply walnut finish").workCenterId("wc-4").durationMinutes(150).build()
        ));

        BoM bom2 = BoM.builder().id("bom-2").bomReference("BOM-000002").productId("p-f2").qtyProduced(1.0).version(1).isActive(true).build();
        bom2.setComponents(List.of(
                BomComponent.builder().id("bc-5").bomId("bom-2").productId("p-w2").qty(1.0).unitOfMeasure("pcs").build(),
                BomComponent.builder().id("bc-6").bomId("bom-2").productId("p-w5").qty(4.0).unitOfMeasure("pcs").build(),
                BomComponent.builder().id("bc-7").bomId("bom-2").productId("p-w3").qty(1.0).unitOfMeasure("pcs").build()
        ));
        bom2.setOperations(List.of(
                BomOperation.builder().id("op-5").bomId("bom-2").sequence(10).name("Cut chair parts").workCenterId("wc-1").durationMinutes(45).build(),
                BomOperation.builder().id("op-6").bomId("bom-2").sequence(20).name("Assemble chair").workCenterId("wc-2").durationMinutes(75).build(),
                BomOperation.builder().id("op-7").bomId("bom-2").sequence(30).name("Polish").workCenterId("wc-4").durationMinutes(90).build()
        ));

        BoM bom3 = BoM.builder().id("bom-3").bomReference("BOM-000003").productId("p-f3").qtyProduced(1.0).version(1).isActive(true).build();
        bom3.setComponents(List.of(
                BomComponent.builder().id("bc-8").bomId("bom-3").productId("p-w2").qty(2.0).unitOfMeasure("pcs").build(),
                BomComponent.builder().id("bc-9").bomId("bom-3").productId("p-w3").qty(1.0).unitOfMeasure("pcs").build(),
                BomComponent.builder().id("bc-10").bomId("bom-3").productId("p-w4").qty(1.0).unitOfMeasure("pcs").build()
        ));
        bom3.setOperations(List.of(
                BomOperation.builder().id("op-8").bomId("bom-3").sequence(10).name("Cut shelves").workCenterId("wc-1").durationMinutes(60).build(),
                BomOperation.builder().id("op-9").bomId("bom-3").sequence(20).name("Assemble shelf frame").workCenterId("wc-2").durationMinutes(100).build(),
                BomOperation.builder().id("op-10").bomId("bom-3").sequence(30).name("Finish coat").workCenterId("wc-4").durationMinutes(120).build()
        ));

        BoM bom4 = BoM.builder().id("bom-4").bomReference("BOM-000004").productId("p-f4").qtyProduced(1.0).version(1).isActive(true).build();
        bom4.setComponents(List.of(
                BomComponent.builder().id("bc-11").bomId("bom-4").productId("p-w2").qty(1.0).unitOfMeasure("pcs").build(),
                BomComponent.builder().id("bc-12").bomId("bom-4").productId("p-w5").qty(4.0).unitOfMeasure("pcs").build(),
                BomComponent.builder().id("bc-13").bomId("bom-4").productId("p-w3").qty(1.0).unitOfMeasure("pcs").build()
        ));
        bom4.setOperations(List.of(
                BomOperation.builder().id("op-11").bomId("bom-4").sequence(10).name("Cut desk panels").workCenterId("wc-1").durationMinutes(50).build(),
                BomOperation.builder().id("op-12").bomId("bom-4").sequence(20).name("Assemble desk").workCenterId("wc-2").durationMinutes(80).build()
        ));

        bomRepository.saveAll(List.of(bom1, bom2, bom3, bom4));

        // 7. Sales Orders
        SalesOrder so1 = SalesOrder.builder().id("so-1").number("SO-2026-0142").customerId("c-1").status("Confirmed").createdBy("u-2").date(LocalDateTime.now().minusDays(2)).build();
        so1.setLines(List.of(
                SalesOrderLine.builder().id("sol-1").salesOrderId("so-1").productId("p-f2").qty(8).unitPrice(new BigDecimal("9200.00")).reservedQty(8).deliveredQty(0).build(),
                SalesOrderLine.builder().id("sol-2").salesOrderId("so-1").productId("p-f4").qty(4).unitPrice(new BigDecimal("6400.00")).reservedQty(4).deliveredQty(0).build()
        ));

        SalesOrder so2 = SalesOrder.builder().id("so-2").number("SO-2026-0143").customerId("c-2").status("Partially Delivered").createdBy("u-4").date(LocalDateTime.now().minusDays(1)).build();
        so2.setLines(List.of(
                SalesOrderLine.builder().id("sol-3").salesOrderId("so-2").productId("p-f2").qty(2).unitPrice(new BigDecimal("9200.00")).reservedQty(1).deliveredQty(1).build()
        ));

        SalesOrder so3 = SalesOrder.builder().id("so-3").number("SO-2026-0144").customerId("c-3").status("Draft").createdBy("u-2").date(LocalDateTime.now().minusHours(4)).build();
        so3.setLines(List.of(
                SalesOrderLine.builder().id("sol-4").salesOrderId("so-3").productId("p-f3").qty(3).unitPrice(new BigDecimal("14800.00")).reservedQty(0).deliveredQty(0).build()
        ));

        SalesOrder so4 = SalesOrder.builder().id("so-4").number("SO-2026-0141").customerId("c-4").status("Fully Delivered").createdBy("u-2").date(LocalDateTime.now().minusDays(5)).build();
        so4.setLines(List.of(
                SalesOrderLine.builder().id("sol-5").salesOrderId("so-4").productId("p-f4").qty(12).unitPrice(new BigDecimal("6400.00")).reservedQty(0).deliveredQty(12).build()
        ));

        SalesOrder so5 = SalesOrder.builder().id("so-5").number("SO-2026-0140").customerId("c-1").status("Fully Delivered").createdBy("u-2").date(LocalDateTime.now().minusDays(6)).build();
        so5.setLines(List.of(
                SalesOrderLine.builder().id("sol-6").salesOrderId("so-5").productId("p-f2").qty(5).unitPrice(new BigDecimal("9200.00")).reservedQty(0).deliveredQty(5).build()
        ));

        SalesOrder so6 = SalesOrder.builder().id("so-6").number("SO-2026-0145").customerId("c-2").status("Fully Delivered").createdBy("u-2").date(LocalDateTime.now().minusDays(4)).build();
        so6.setLines(List.of(
                SalesOrderLine.builder().id("sol-7").salesOrderId("so-6").productId("p-f4").qty(6).unitPrice(new BigDecimal("6400.00")).reservedQty(0).deliveredQty(6).build()
        ));

        SalesOrder so7 = SalesOrder.builder().id("so-7").number("SO-2026-0146").customerId("c-3").status("Confirmed").createdBy("u-2").date(LocalDateTime.now().minusDays(3)).build();
        so7.setLines(List.of(
                SalesOrderLine.builder().id("sol-8").salesOrderId("so-7").productId("p-f3").qty(2).unitPrice(new BigDecimal("14800.00")).reservedQty(2).deliveredQty(0).build()
        ));

        SalesOrder so8 = SalesOrder.builder().id("so-8").number("SO-2026-0147").customerId("c-4").status("Fully Delivered").createdBy("u-2").date(LocalDateTime.now().minusDays(2)).build();
        so8.setLines(List.of(
                SalesOrderLine.builder().id("sol-9").salesOrderId("so-8").productId("p-f2").qty(4).unitPrice(new BigDecimal("9200.00")).reservedQty(0).deliveredQty(4).build()
        ));

        SalesOrder so9 = SalesOrder.builder().id("so-9").number("SO-2026-0148").customerId("c-1").status("Fully Delivered").createdBy("u-2").date(LocalDateTime.now().minusDays(1)).build();
        so9.setLines(List.of(
                SalesOrderLine.builder().id("sol-10").salesOrderId("so-9").productId("p-f4").qty(3).unitPrice(new BigDecimal("6400.00")).reservedQty(0).deliveredQty(3).build()
        ));

        SalesOrder so10 = SalesOrder.builder().id("so-10").number("SO-2026-0149").customerId("c-2").status("Confirmed").createdBy("u-2").date(LocalDateTime.now().minusHours(12)).build();
        so10.setLines(List.of(
                SalesOrderLine.builder().id("sol-11").salesOrderId("so-10").productId("p-f2").qty(2).unitPrice(new BigDecimal("9200.00")).reservedQty(2).deliveredQty(0).build()
        ));

        salesOrderRepository.saveAll(List.of(so1, so2, so3, so4, so5, so6, so7, so8, so9, so10));

        // 8. Purchase Orders
        PurchaseOrder po1 = PurchaseOrder.builder().id("po-1").number("PO-2026-0088").vendorId("v-1").status("Partially Received").createdBy("u-2").isAutoGenerated(false).date(LocalDateTime.now().minusDays(3)).build();
        po1.setLines(List.of(
                PurchaseOrderLine.builder().id("pol-1").purchaseOrderId("po-1").productId("p-w1").qty(30).unitPrice(new BigDecimal("1200.00")).receivedQty(18).build(),
                PurchaseOrderLine.builder().id("pol-2").purchaseOrderId("po-1").productId("p-w5").qty(50).unitPrice(new BigDecimal("320.00")).receivedQty(50).build()
        ));

        PurchaseOrder po2 = PurchaseOrder.builder().id("po-2").number("PO-2026-0089").vendorId("v-3").status("Confirmed").createdBy("u-2").isAutoGenerated(true).triggeringSalesOrderId("so-1").date(LocalDateTime.now().minusDays(1)).build();
        po2.setLines(List.of(
                PurchaseOrderLine.builder().id("pol-3").purchaseOrderId("po-2").productId("p-w4").qty(12).unitPrice(new BigDecimal("620.00")).receivedQty(0).build()
        ));

        purchaseOrderRepository.saveAll(List.of(po1, po2));

        // 9. Manufacturing Orders
        ManufacturingOrder mo1 = ManufacturingOrder.builder().id("mo-1").number("MO-2026-0034").productId("p-f1").qty(2).status("In Progress").assigneeId("u-4").isAutoGenerated(false).date(LocalDateTime.now().minusDays(2)).build();
        mo1.setComponents(List.of(
                MoComponent.builder().moId("mo-1").productId("p-w1").requiredQty(6).toConsumeQty(6).consumedQty(0).build(),
                MoComponent.builder().moId("mo-1").productId("p-w5").requiredQty(8).toConsumeQty(8).consumedQty(0).build(),
                MoComponent.builder().moId("mo-1").productId("p-w3").requiredQty(2).toConsumeQty(2).consumedQty(0).build(),
                MoComponent.builder().moId("mo-1").productId("p-w4").requiredQty(2).toConsumeQty(2).consumedQty(0).build()
        ));
        mo1.setWorkOrders(List.of(
                WorkOrder.builder().id("wo-1").moId("mo-1").name("Cut planks to size").workCenterId("wc-1").status("Done").expectedDurationMinutes(90).actualDurationMinutes(92).build(),
                WorkOrder.builder().id("wo-2").moId("mo-1").name("Sand all surfaces").workCenterId("wc-3").status("Started").expectedDurationMinutes(60).actualDurationMinutes(0).startedAt(LocalDateTime.now().minusMinutes(12)).build(),
                WorkOrder.builder().id("wo-3").moId("mo-1").name("Assemble table").workCenterId("wc-2").status("Pending").expectedDurationMinutes(120).actualDurationMinutes(0).build(),
                WorkOrder.builder().id("wo-4").moId("mo-1").name("Apply walnut finish").workCenterId("wc-4").status("Pending").expectedDurationMinutes(150).actualDurationMinutes(0).build()
        ));

        ManufacturingOrder mo2 = ManufacturingOrder.builder().id("mo-2").number("MO-2026-0035").productId("p-f3").qty(3).status("Draft").assigneeId("u-4").isAutoGenerated(true).triggeringSalesOrderId("so-3").date(LocalDateTime.now().minusHours(1)).build();
        mo2.setComponents(List.of(
                MoComponent.builder().moId("mo-2").productId("p-w2").requiredQty(6).toConsumeQty(6).consumedQty(0).build(),
                MoComponent.builder().moId("mo-2").productId("p-w3").requiredQty(3).toConsumeQty(3).consumedQty(0).build(),
                MoComponent.builder().moId("mo-2").productId("p-w4").requiredQty(3).toConsumeQty(3).consumedQty(0).build()
        ));
        mo2.setWorkOrders(List.of(
                WorkOrder.builder().id("wo-d-0").moId("mo-2").name("Cut shelves").workCenterId("wc-1").status("Pending").expectedDurationMinutes(60).actualDurationMinutes(0).build(),
                WorkOrder.builder().id("wo-d-1").moId("mo-2").name("Assemble shelf frame").workCenterId("wc-2").status("Pending").expectedDurationMinutes(100).actualDurationMinutes(0).build(),
                WorkOrder.builder().id("wo-d-2").moId("mo-2").name("Finish coat").workCenterId("wc-4").status("Pending").expectedDurationMinutes(120).actualDurationMinutes(0).build()
        ));

        manufacturingOrderRepository.saveAll(List.of(mo1, mo2));

        // 10. Stock Ledger entries
        StockLedger l1 = StockLedger.builder().id("l-1").productId("p-f4").movementType("SALES_DELIVERY").quantity(12).onHandAfter(22).reservedAfter(0).referenceType("SO").referenceId("so-4").notes("Delivered 12 units").ts(LocalDateTime.now().minusDays(8)).build();
        StockLedger l2 = StockLedger.builder().id("l-2").productId("p-w5").movementType("PURCHASE_RECEIPT").quantity(50).onHandAfter(96).reservedAfter(0).referenceType("PO").referenceId("po-1").notes("Received 50 units").ts(LocalDateTime.now().minusDays(3)).build();
        StockLedger l3 = StockLedger.builder().id("l-3").productId("p-w1").movementType("PURCHASE_RECEIPT").quantity(18).onHandAfter(84).reservedAfter(0).referenceType("PO").referenceId("po-1").notes("Received 18 units").ts(LocalDateTime.now().minusDays(2)).build();
        StockLedger l4 = StockLedger.builder().id("l-4").productId("p-f2").movementType("SALES_RESERVE").quantity(8).onHandAfter(14).reservedAfter(8).referenceType("SO").referenceId("so-1").notes("Reserved 8 units").ts(LocalDateTime.now().minusDays(2)).build();
        StockLedger l5 = StockLedger.builder().id("l-5").productId("p-f2").movementType("SALES_DELIVERY").quantity(1).onHandAfter(14).reservedAfter(9).referenceType("SO").referenceId("so-2").notes("Delivered 1 unit").ts(LocalDateTime.now().minusDays(1)).build();

        stockLedgerRepository.saveAll(List.of(l1, l2, l3, l4, l5));

        // 11. Audit logs
        AuditLog a1 = AuditLog.builder().id("a-1").userId("u-2").entityType("SalesOrder").entityId("so-1").action("Confirmed").oldValue("\"Draft\"").newValue("\"Confirmed\"").ts(LocalDateTime.now().minusDays(2)).build();
        AuditLog a2 = AuditLog.builder().id("a-2").userId("u-2").entityType("PurchaseOrder").entityId("po-2").action("Auto-created").oldValue(null).newValue("\"Draft (from SO-2026-0142)\"").ts(LocalDateTime.now().minusDays(2)).build();
        AuditLog a3 = AuditLog.builder().id("a-3").userId("u-4").entityType("SalesOrder").entityId("so-2").action("Partially Delivered").oldValue("\"0\"").newValue("\"1\"").ts(LocalDateTime.now().minusDays(1)).build();
        AuditLog a4 = AuditLog.builder().id("a-4").userId("u-2").entityType("SalesOrder").entityId("so-3").action("Created").oldValue(null).newValue("\"Created draft SO\"").ts(LocalDateTime.now().minusHours(2)).build();

        auditLogRepository.saveAll(List.of(a1, a2, a3, a4));
    }
}

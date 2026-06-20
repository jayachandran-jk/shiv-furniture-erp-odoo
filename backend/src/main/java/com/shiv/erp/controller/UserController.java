package com.shiv.erp.controller;

import com.shiv.erp.model.User;
import com.shiv.erp.repository.UserRepository;
import com.shiv.erp.service.AuditLogService;
import com.shiv.erp.utils.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder, AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ResponseEntity<List<User>> getUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createUser(@Valid @RequestBody User user) {
        String email = user.getEmail().trim().toLowerCase();
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Email is already in use"));
        }

        user.setId("u-" + UUID.randomUUID().toString().substring(0, 8));
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash() != null ? user.getPasswordHash() : "password"));
        user.setIsActive(true);

        User saved = userRepository.save(user);

        auditLogService.logChange(
                SecurityUtils.getCurrentUserId(),
                "User",
                saved.getId(),
                "Created",
                null,
                String.format("{\"email\": \"%s\", \"name\": \"%s\", \"role\": \"%s\"}", saved.getEmail(), saved.getName(), saved.getRole())
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/{id}/toggle-active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> toggleActive(@PathVariable String id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found"));
        }

        if (id.equals(SecurityUtils.getCurrentUserId())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "You cannot deactivate your own account"));
        }

        boolean oldStatus = user.getIsActive();
        user.setIsActive(!oldStatus);
        User saved = userRepository.save(user);

        auditLogService.logChange(
                SecurityUtils.getCurrentUserId(),
                "User",
                saved.getId(),
                "Toggled active",
                String.valueOf(oldStatus),
                String.valueOf(saved.getIsActive())
        );

        return ResponseEntity.ok(saved);
    }
}

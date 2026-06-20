package com.shiv.erp.controller;

import com.shiv.erp.dto.AuthResponse;
import com.shiv.erp.dto.LoginRequest;
import com.shiv.erp.dto.SignupRequest;
import com.shiv.erp.model.User;
import com.shiv.erp.repository.UserRepository;
import com.shiv.erp.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        // Look up user case-insensitive
        User user = userRepository.findByEmailIgnoreCase(request.getEmail().trim().toLowerCase()).orElse(null);
        
        System.out.println("Login attempt for: " + request.getEmail());
        System.out.println("User found: " + (user != null));
        if (user != null) {
            System.out.println("isActive: " + user.getIsActive());
            System.out.println("password match: " + passwordEncoder.matches(request.getPassword(), user.getPasswordHash()));
        }

        if (user == null || Boolean.FALSE.equals(user.getIsActive()) || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            String dbg = user == null ? "User is null" : "isActive: " + user.getIsActive() + " Pwd: " + passwordEncoder.matches(request.getPassword(), user.getPasswordHash());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password: " + dbg));
        }

        String token = jwtService.generateToken(user.getEmail(), user.getRole(), user.getEmail());

        AuthResponse.UserResponse userResponse = AuthResponse.UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .build();

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .user(userResponse)
                .build());
    }

    @PostMapping("/signup")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Email is already in use"));
        }

        User user = User.builder()
                .id(UUID.randomUUID().toString())
                .name(request.getName().trim())
                .email(email)
                .role(request.getRole())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .isActive(true)
                .build();

        userRepository.save(user);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "role", user.getRole()
        ));
    }
}

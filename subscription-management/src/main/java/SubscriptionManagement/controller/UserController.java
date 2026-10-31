package SubscriptionManagement.controller;

import SubscriptionManagement.dto.RegisterRequest;
import SubscriptionManagement.dto.UserResponse;
import SubscriptionManagement.entity.User;
import SubscriptionManagement.service.UserService;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> registerUser(
            @Valid @RequestBody RegisterRequest request) {

        User savedUser = userService.registerUser(request);

        UserResponse response = new UserResponse(
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getRole(),
                savedUser.getEnabled(),
                savedUser.getCreatedAt()
        );

        return ResponseEntity.ok(response);
    }
}

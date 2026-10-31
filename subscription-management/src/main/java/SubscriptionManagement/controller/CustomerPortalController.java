package SubscriptionManagement.controller;

import SubscriptionManagement.dto.CustomerProfileRequest;
import SubscriptionManagement.dto.CustomerProfileResponse;
import SubscriptionManagement.service.CustomerPortalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customer")
@PreAuthorize("hasRole('CUSTOMER')")
@RequiredArgsConstructor
public class CustomerPortalController {

    private final CustomerPortalService customerPortalService;

    @GetMapping("/me")
    public ResponseEntity<CustomerProfileResponse> getMyProfile(Authentication authentication) {
        String email = authentication.getName();
        CustomerProfileResponse response = customerPortalService.getProfile(email);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    public ResponseEntity<CustomerProfileResponse> updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody CustomerProfileRequest request) {
        String email = authentication.getName();
        CustomerProfileResponse response = customerPortalService.updateProfile(email, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/subscriptions")
    public ResponseEntity<List<Object>> getMySubscriptions(Authentication authentication) {
        String email = authentication.getName();
        List<Object> subscriptions = customerPortalService.getSubscriptions(email);
        return ResponseEntity.ok(subscriptions);
    }

    @GetMapping("/invoices")
    public ResponseEntity<List<Object>> getMyInvoices(Authentication authentication) {
        String email = authentication.getName();
        List<Object> invoices = customerPortalService.getInvoices(email);
        return ResponseEntity.ok(invoices);
    }
}


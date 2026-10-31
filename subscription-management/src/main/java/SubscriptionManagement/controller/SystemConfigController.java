package SubscriptionManagement.controller;

import SubscriptionManagement.dto.SystemConfigRequest;
import SubscriptionManagement.dto.SystemConfigResponse;
import SubscriptionManagement.service.SystemConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/config")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class SystemConfigController {

    private final SystemConfigService systemConfigService;

    @GetMapping
    public ResponseEntity<SystemConfigResponse> getConfig() {
        SystemConfigResponse response = systemConfigService.getConfig();
        return ResponseEntity.ok(response);
    }

    @PutMapping
    public ResponseEntity<SystemConfigResponse> updateConfig(
            @Valid @RequestBody SystemConfigRequest request) {
        SystemConfigResponse response = systemConfigService.updateConfig(request);
        return ResponseEntity.ok(response);
    }
}


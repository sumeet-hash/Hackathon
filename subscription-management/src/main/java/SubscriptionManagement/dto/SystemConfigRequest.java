package SubscriptionManagement.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemConfigRequest {

    @NotBlank(message = "Company name is required")
    @Size(max = 150, message = "Company name must not exceed 150 characters")
    private String companyName;

    @NotBlank(message = "Default currency is required")
    @Pattern(regexp = "^[A-Z]{3}$", message = "Default currency must be a 3-letter uppercase ISO code (e.g. USD, EUR)")
    private String defaultCurrency;

    @NotNull(message = "Tax rate is required")
    @DecimalMin(value = "0.0", message = "Tax rate cannot be negative")
    @DecimalMax(value = "100.0", message = "Tax rate cannot exceed 100.0%")
    private BigDecimal taxRate;

    @NotBlank(message = "Invoice prefix is required")
    @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Invoice prefix can only contain letters, digits, hyphens, and underscores")
    @Size(max = 20, message = "Invoice prefix must not exceed 20 characters")
    private String invoicePrefix;

    private Map<String, String> additionalSettings;
}


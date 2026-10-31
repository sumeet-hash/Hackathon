package SubscriptionManagement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemConfigResponse {

    private String companyName;
    private String defaultCurrency;
    private BigDecimal taxRate;
    private String invoicePrefix;
    private Map<String, String> allSettings;
    private LocalDateTime lastUpdated;
}


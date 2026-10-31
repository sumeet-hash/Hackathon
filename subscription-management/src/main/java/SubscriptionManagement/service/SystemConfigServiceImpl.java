package SubscriptionManagement.service;

import SubscriptionManagement.dto.SystemConfigRequest;
import SubscriptionManagement.dto.SystemConfigResponse;
import SubscriptionManagement.entity.SystemConfig;
import SubscriptionManagement.repository.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SystemConfigServiceImpl implements SystemConfigService {

    public static final String KEY_COMPANY_NAME = "company_name";
    public static final String KEY_DEFAULT_CURRENCY = "default_currency";
    public static final String KEY_TAX_RATE = "tax_rate";
    public static final String KEY_INVOICE_PREFIX = "invoice_prefix";

    private static final String DEFAULT_COMPANY_NAME = "Brightloop Software";
    private static final String DEFAULT_CURRENCY = "USD";
    private static final String DEFAULT_TAX_RATE = "10.0";
    private static final String DEFAULT_INVOICE_PREFIX = "INV-";

    private final SystemConfigRepository systemConfigRepository;

    @Override
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seedDefaultConfigs() {
        log.info("Checking and seeding default system configuration values...");

        seedIfMissing(KEY_COMPANY_NAME, DEFAULT_COMPANY_NAME, "Company business name");
        seedIfMissing(KEY_DEFAULT_CURRENCY, DEFAULT_CURRENCY, "Default currency ISO code");
        seedIfMissing(KEY_TAX_RATE, DEFAULT_TAX_RATE, "Default global tax rate percentage");
        seedIfMissing(KEY_INVOICE_PREFIX, DEFAULT_INVOICE_PREFIX, "Prefix for generated invoices");

        log.info("System configuration check complete.");
    }

    private void seedIfMissing(String key, String defaultValue, String description) {
        if (!systemConfigRepository.existsByConfigKey(key)) {
            SystemConfig config = SystemConfig.builder()
                    .configKey(key)
                    .configValue(defaultValue)
                    .description(description)
                    .updatedAt(LocalDateTime.now())
                    .build();
            systemConfigRepository.save(config);
            log.info("Seeded default config [{} = {}]", key, defaultValue);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public SystemConfigResponse getConfig() {
        List<SystemConfig> allConfigs = systemConfigRepository.findAll();

        Map<String, String> configMap = allConfigs.stream()
                .collect(Collectors.toMap(
                        SystemConfig::getConfigKey,
                        SystemConfig::getConfigValue,
                        (existing, replacement) -> existing,
                        LinkedHashMap::new
                ));

        String companyName = configMap.getOrDefault(KEY_COMPANY_NAME, DEFAULT_COMPANY_NAME);
        String currency = configMap.getOrDefault(KEY_DEFAULT_CURRENCY, DEFAULT_CURRENCY);
        String taxRateStr = configMap.getOrDefault(KEY_TAX_RATE, DEFAULT_TAX_RATE);
        String invoicePrefix = configMap.getOrDefault(KEY_INVOICE_PREFIX, DEFAULT_INVOICE_PREFIX);

        BigDecimal taxRate;
        try {
            taxRate = new BigDecimal(taxRateStr);
        } catch (Exception ex) {
            taxRate = new BigDecimal(DEFAULT_TAX_RATE);
        }

        LocalDateTime lastUpdated = allConfigs.stream()
                .map(SystemConfig::getUpdatedAt)
                .filter(dt -> dt != null)
                .max(LocalDateTime::compareTo)
                .orElse(LocalDateTime.now());

        return SystemConfigResponse.builder()
                .companyName(companyName)
                .defaultCurrency(currency)
                .taxRate(taxRate)
                .invoicePrefix(invoicePrefix)
                .allSettings(configMap)
                .lastUpdated(lastUpdated)
                .build();
    }

    @Override
    @Transactional
    public SystemConfigResponse updateConfig(SystemConfigRequest request) {
        upsertConfig(KEY_COMPANY_NAME, request.getCompanyName().trim(), "Company business name");
        upsertConfig(KEY_DEFAULT_CURRENCY, request.getDefaultCurrency().trim().toUpperCase(), "Default currency ISO code");
        upsertConfig(KEY_TAX_RATE, request.getTaxRate().stripTrailingZeros().toPlainString(), "Default global tax rate percentage");
        upsertConfig(KEY_INVOICE_PREFIX, request.getInvoicePrefix().trim(), "Prefix for generated invoices");

        if (request.getAdditionalSettings() != null) {
            request.getAdditionalSettings().forEach((key, value) -> {
                if (key != null && !key.isBlank() && value != null) {
                    upsertConfig(key.trim(), value.trim(), "Custom system setting");
                }
            });
        }

        return getConfig();
    }

    private void upsertConfig(String key, String value, String description) {
        SystemConfig config = systemConfigRepository.findByConfigKey(key)
                .orElseGet(() -> SystemConfig.builder()
                        .configKey(key)
                        .description(description)
                        .build());

        config.setConfigValue(value);
        config.setUpdatedAt(LocalDateTime.now());
        systemConfigRepository.save(config);
    }

    @Override
    @Transactional(readOnly = true)
    public String getValue(String key, String defaultValue) {
        return systemConfigRepository.findByConfigKey(key)
                .map(SystemConfig::getConfigValue)
                .orElse(defaultValue);
    }
}


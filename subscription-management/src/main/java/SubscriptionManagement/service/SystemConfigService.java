package SubscriptionManagement.service;

import SubscriptionManagement.dto.SystemConfigRequest;
import SubscriptionManagement.dto.SystemConfigResponse;

import java.util.Map;

public interface SystemConfigService {

    SystemConfigResponse getConfig();

    SystemConfigResponse updateConfig(SystemConfigRequest request);

    String getValue(String key, String defaultValue);

    void seedDefaultConfigs();
}


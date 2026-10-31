package SubscriptionManagement.service;

import SubscriptionManagement.dto.CreateStaffRequest;
import SubscriptionManagement.dto.StaffResponse;
import SubscriptionManagement.dto.StaffStatusUpdateRequest;
import SubscriptionManagement.dto.UpdateStaffRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface StaffService {

    StaffResponse createStaff(CreateStaffRequest request);

    Page<StaffResponse> getAllStaff(Pageable pageable);

    StaffResponse getStaffById(Long id);

    StaffResponse updateStaff(Long id, UpdateStaffRequest request);

    StaffResponse updateStaffStatus(Long id, StaffStatusUpdateRequest request);
}


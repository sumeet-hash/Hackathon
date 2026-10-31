package SubscriptionManagement.repository;

import SubscriptionManagement.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StaffRepository extends JpaRepository<User, Long> {

    Page<User> findByRole(String role, Pageable pageable);

    Optional<User> findByIdAndRole(Long id, String role);

    boolean existsByEmail(String email);

    boolean existsByEmailAndIdNot(String email, Long id);
}


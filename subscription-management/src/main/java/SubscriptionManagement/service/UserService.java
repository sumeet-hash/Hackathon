
package SubscriptionManagement.service;

import SubscriptionManagement.dto.RegisterRequest;
import SubscriptionManagement.entity.User;
import SubscriptionManagement.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User registerUser(RegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        User user = new User();

        user.setEmail(request.getEmail());

        // Hash the password before saving
        user.setPasswordHash(
                passwordEncoder.encode(request.getPassword())
        );

        user.setRole("CUSTOMER");
        user.setEnabled(true);

        return userRepository.save(user);
    }
}

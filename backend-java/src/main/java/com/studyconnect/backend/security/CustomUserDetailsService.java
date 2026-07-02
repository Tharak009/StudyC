package com.studyconnect.backend.security;

import com.studyconnect.backend.entity.User;
import com.studyconnect.backend.repository.UserRepository;
import java.util.Optional;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository users;

    public CustomUserDetailsService(UserRepository users) {
        this.users = users;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = users.findByEmailIgnoreCase(username)
                .or(() -> users.findById(username))
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return new UserPrincipal(user.getId(), user.getEmail(), user.getRole(), user.getPassword());
    }
}

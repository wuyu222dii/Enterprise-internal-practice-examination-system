package com.examsystem.modules.outage.repository;

import com.examsystem.modules.outage.entity.OutageEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OutageEventRepository extends JpaRepository<OutageEvent, String> {
    Page<OutageEvent> findAllByOrderByCreatedAtDesc(Pageable pageable);

    boolean existsByStatus(String status);
}

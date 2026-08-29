package com.examsystem.modules.practice.repository;

import com.examsystem.modules.practice.entity.PracticeSessionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PracticeSessionItemRepository extends JpaRepository<PracticeSessionItem, String> {
    List<PracticeSessionItem> findByPracticeSessionIdOrderByItemOrderAsc(String practiceSessionId);
}

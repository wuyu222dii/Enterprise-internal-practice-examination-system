package com.examsystem.modules.mock.repository;

import com.examsystem.modules.mock.entity.MockPaperItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MockPaperItemRepository extends JpaRepository<MockPaperItem, String> {
    List<MockPaperItem> findByMockAttemptIdOrderByItemOrderAsc(String mockAttemptId);
}

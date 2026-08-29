package com.examsystem.modules.question.repository;

import com.examsystem.modules.question.entity.KnowledgePoint;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface KnowledgePointRepository extends JpaRepository<KnowledgePoint, String> {
    List<KnowledgePoint> findByCategoryIdOrderByNameAsc(String categoryId);
    Optional<KnowledgePoint> findByCategoryIdAndName(String categoryId, String name);
}

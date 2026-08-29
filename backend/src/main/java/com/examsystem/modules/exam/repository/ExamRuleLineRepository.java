package com.examsystem.modules.exam.repository;

import com.examsystem.modules.exam.entity.ExamRuleLine;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExamRuleLineRepository extends JpaRepository<ExamRuleLine, String> {
    List<ExamRuleLine> findByPublishedVersionIdOrderByLineOrderAsc(String publishedVersionId);
}

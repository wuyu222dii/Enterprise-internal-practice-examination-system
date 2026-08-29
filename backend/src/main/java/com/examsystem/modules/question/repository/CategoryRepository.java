package com.examsystem.modules.question.repository;

import com.examsystem.modules.question.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, String> {
    List<Category> findByQuestionBankIdOrderByNameAsc(String questionBankId);
    Optional<Category> findByQuestionBankIdAndName(String questionBankId, String name);
}

package com.examsystem.modules.question.repository;

import com.examsystem.modules.question.entity.QuestionVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface QuestionVersionRepository extends JpaRepository<QuestionVersion, String> {
    List<QuestionVersion> findByQuestionIdOrderByVersionNoDesc(String questionId);

    Optional<QuestionVersion> findTopByQuestionIdOrderByVersionNoDesc(String questionId);

    /**
     * Latest active version of every question in a bank, optionally narrowed to a category or
     * knowledge point. Scope filtering happens in the database so a 10,000-question bank never gets
     * loaded into memory just to be filtered.
     */
    @Query("""
            SELECT v FROM QuestionVersion v
            WHERE v.questionId IN (
                    SELECT q.id FROM Question q
                    WHERE q.questionBankId = :bankId
                      AND (:categoryId IS NULL OR q.categoryId = :categoryId)
                      AND (:knowledgePointId IS NULL OR q.knowledgePointId = :knowledgePointId)
                  )
              AND v.status = 'active'
              AND v.versionNo = (
                  SELECT MAX(v2.versionNo) FROM QuestionVersion v2 WHERE v2.questionId = v.questionId
              )
            """)
    List<QuestionVersion> findLatestActiveByBankAndScope(
            @Param("bankId") String bankId,
            @Param("categoryId") String categoryId,
            @Param("knowledgePointId") String knowledgePointId
    );

    /**
     * Candidate pool as bare ids. Paper generation only needs to draw a handful of ids at random, so
     * hydrating 10,000 versions with their stems and option JSON per attempt start is wasteful.
     * {@code type} is optional; pass null to accept every question type.
     */
    @Query("""
            SELECT v.id FROM QuestionVersion v
            WHERE v.questionId IN (SELECT q.id FROM Question q WHERE q.questionBankId = :bankId)
              AND v.status = 'active'
              AND (:type IS NULL OR v.type = :type)
              AND v.versionNo = (
                  SELECT MAX(v2.versionNo) FROM QuestionVersion v2 WHERE v2.questionId = v.questionId
              )
            """)
    List<String> findLatestActiveIdsByBankAndType(
            @Param("bankId") String bankId,
            @Param("type") String type
    );

    @Query("""
            SELECT v FROM QuestionVersion v
            WHERE v.questionId IN :questionIds
              AND v.versionNo = (
                  SELECT MAX(v2.versionNo) FROM QuestionVersion v2 WHERE v2.questionId = v.questionId
              )
            """)
    List<QuestionVersion> findLatestByQuestionIds(@Param("questionIds") Collection<String> questionIds);
}

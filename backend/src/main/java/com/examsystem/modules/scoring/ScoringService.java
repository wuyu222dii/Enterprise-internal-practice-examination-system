package com.examsystem.modules.scoring;

import com.examsystem.common.JsonHelper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class ScoringService {

    public boolean isCorrect(String questionType, String standardAnswerJson, List<String> userAnswer) {
        List<String> standard = JsonHelper.toStringList(standardAnswerJson);
        List<String> normalizedUser = userAnswer == null ? List.of() : userAnswer.stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        return switch (questionType) {
            case "singleChoice", "trueFalse" -> normalizedUser.size() == 1
                    && standard.size() == 1
                    && standard.get(0).equals(normalizedUser.get(0));
            case "multipleChoice" -> setsEqual(new HashSet<>(standard), new HashSet<>(normalizedUser));
            default -> false;
        };
    }

    private boolean setsEqual(Set<String> a, Set<String> b) {
        return a.equals(b);
    }

    public List<String> normalizeAnswer(List<String> answer) {
        if (answer == null) {
            return Collections.emptyList();
        }
        return new ArrayList<>(answer);
    }
}

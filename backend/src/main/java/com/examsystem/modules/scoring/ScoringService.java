package com.examsystem.modules.scoring;

import com.examsystem.common.JsonHelper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

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
            case "multipleChoice" -> sortedListsEqual(standard, normalizedUser);
            case "essay" -> normalizedUser.size() == 1
                    && standard.size() == 1
                    && normalizeEssay(standard.get(0)).equals(normalizeEssay(normalizedUser.get(0)));
            default -> false;
        };
    }

    private static String normalizeEssay(String text) {
        return text == null ? "" : text.trim().replaceAll("\\s+", " ");
    }

    private boolean sortedListsEqual(List<String> a, List<String> b) {
        List<String> sortedA = new ArrayList<>(a);
        List<String> sortedB = new ArrayList<>(b);
        Collections.sort(sortedA);
        Collections.sort(sortedB);
        return sortedA.equals(sortedB);
    }

    public List<String> normalizeAnswer(List<String> answer) {
        if (answer == null) {
            return Collections.emptyList();
        }
        return new ArrayList<>(answer);
    }
}

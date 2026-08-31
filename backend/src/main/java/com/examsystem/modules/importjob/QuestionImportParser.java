package com.examsystem.modules.importjob;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.JsonHelper;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses question-import workbooks. Supports three header layouts:
 * <ul>
 *   <li>Legacy bank: 一级科目 / 题型 / 题目内容 / 正确答案（题干与选项写在同一格）</li>
 *   <li>Standard: 分类 / 题干 / 选项A–D（需求分析 §7.3）</li>
 *   <li>JSON columns: type / stem / options / standardAnswer / difficulty</li>
 * </ul>
 */
final class QuestionImportParser {

    static final int MAX_ROWS = 1000;

    private static final Set<String> VALID_TYPES = Set.of("singleChoice", "multipleChoice", "trueFalse", "essay");
    private static final Set<String> VALID_DIFFICULTIES = Set.of("easy", "medium", "hard");
    private static final DataFormatter DATA_FORMATTER = new DataFormatter();

    private static final Pattern LINE_OPTION = Pattern.compile(
            "^([A-F])(?:[．.、]\\s*|[ \\t]+)(.+)$"
    );
    private static final Pattern LINE_OPTION_NOSEP = Pattern.compile(
            "^([A-F])(?![．.、\\s])(.+)$"
    );
    private static final Pattern INLINE_OPTION = Pattern.compile(
            "(?<![A-Za-z0-9])([A-F])[．.、]\\s*"
    );
    private static final Pattern CHOICE_LETTERS = Pattern.compile("^[A-F]+$");

    private QuestionImportParser() {
    }

    static ParseResult parse(InputStream inputStream) {
        try (Workbook workbook = new XSSFWorkbook(inputStream)) {
            if (workbook.getNumberOfSheets() == 0) {
                throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "Excel 文件为空", 422);
            }
            List<Map<String, Object>> validRows = new ArrayList<>();
            List<Map<String, Object>> errorRows = new ArrayList<>();
            int dataRowCount = 0;
            int recognizedSheets = 0;

            for (int s = 0; s < workbook.getNumberOfSheets(); s++) {
                Sheet sheet = workbook.getSheetAt(s);
                if (sheet == null || sheet.getPhysicalNumberOfRows() == 0) {
                    continue;
                }
                Row headerRow = sheet.getRow(0);
                Format format = detectFormat(headerRow);
                if (format == Format.UNKNOWN) {
                    continue;
                }
                recognizedSheets++;
                Map<String, Integer> cols = columnIndex(headerRow);

                for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                    Row row = sheet.getRow(i);
                    if (row == null || isEmptyRow(row, cols)) {
                        continue;
                    }
                    if (isInstructionRow(row, cols, format)) {
                        continue;
                    }
                    dataRowCount++;
                    if (dataRowCount > MAX_ROWS) {
                        throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "超过 1000 行数据限制", 422);
                    }
                    int rowNum = i + 1;
                    ParsedRow parsed = switch (format) {
                        case LEGACY_BANK -> parseLegacyRow(row, cols);
                        case STANDARD -> parseStandardRow(row, cols);
                        case JSON_COLUMNS -> parseJsonRow(row, cols);
                        case UNKNOWN -> ParsedRow.fail(List.of("无法识别的表头"));
                    };
                    if (!parsed.errors.isEmpty()) {
                        errorRows.add(errorRecord(sheet.getSheetName(), rowNum, parsed.errors));
                    } else {
                        validRows.add(validRecord(sheet.getSheetName(), rowNum, parsed));
                    }
                }
            }

            if (recognizedSheets == 0) {
                throw BusinessException.of(ErrorCode.VALIDATION_ERROR,
                        "表头不正确。请使用系统模板，或历史题库模板（一级科目、题型、题目内容、正确答案）", 422);
            }
            if (validRows.isEmpty() && errorRows.isEmpty()) {
                throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "Excel 没有可导入的题目行", 422);
            }

            Map<String, Object> preview = new LinkedHashMap<>();
            preview.put("validRows", validRows);
            preview.put("errorRows", errorRows);
            return new ParseResult(validRows.size(), errorRows.size(), preview);
        } catch (BusinessException e) {
            throw e;
        } catch (IOException e) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "Excel 解析失败", 422);
        }
    }

    private static Format detectFormat(Row headerRow) {
        if (headerRow == null) {
            return Format.UNKNOWN;
        }
        Set<String> names = columnIndex(headerRow).keySet();
        if (names.contains("一级科目") && names.contains("题目内容") && names.contains("题型")) {
            return Format.LEGACY_BANK;
        }
        if (names.contains("分类") && names.contains("题干") && names.contains("题型")) {
            return Format.STANDARD;
        }
        if (names.contains("type") && names.contains("stem") && names.contains("options")) {
            return Format.JSON_COLUMNS;
        }
        return Format.UNKNOWN;
    }

    private static Map<String, Integer> columnIndex(Row headerRow) {
        Map<String, Integer> cols = new LinkedHashMap<>();
        if (headerRow == null) {
            return cols;
        }
        short last = headerRow.getLastCellNum();
        for (int i = 0; i < last; i++) {
            String name = normalizeHeader(cellValue(headerRow, i));
            if (!name.isEmpty()) {
                cols.put(name, i);
            }
        }
        if (cols.containsKey("难度") && !cols.containsKey("难易度")) {
            cols.put("难易度", cols.get("难度"));
        }
        if (cols.containsKey("难易度") && !cols.containsKey("难度")) {
            cols.put("难度", cols.get("难易度"));
        }
        return cols;
    }

    private static String normalizeHeader(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.replace(" ", "").replace("\u3000", "").trim();
    }

    private static ParsedRow parseLegacyRow(Row row, Map<String, Integer> cols) {
        List<String> errors = new ArrayList<>();
        String level1 = col(row, cols, "一级科目");
        String level2 = col(row, cols, "二级科目");
        String level3 = col(row, cols, "三级科目");
        String typeLabel = col(row, cols, "题型");
        String difficultyLabel = firstNonBlank(col(row, cols, "难易度"), col(row, cols, "难度"));
        String content = col(row, cols, "题目内容");
        String answerRaw = col(row, cols, "正确答案");
        String examKind = col(row, cols, "试题类型");

        String type = mapType(typeLabel);
        if (type == null) {
            errors.add("题型无效，应为 判断 / 单选 / 多选");
        }
        String difficulty = mapDifficulty(difficultyLabel);
        if (difficulty == null) {
            errors.add("难易度无效，应为 易/中/难 或 简单/一般/困难");
        }
        String categoryName = resolveCategory(level1, level2, level3);
        String knowledgePointName = resolveKnowledgePoint(level1, level2, level3);
        if (categoryName == null) {
            errors.add("一级/二级/三级科目至少填写一项作为分类");
        }
        if (content.isBlank()) {
            errors.add("题目内容不能为空");
        }
        if (answerRaw.isBlank()) {
            errors.add("正确答案不能为空");
        }
        if (!errors.isEmpty()) {
            return ParsedRow.fail(errors);
        }

        String stem;
        List<Map<String, Object>> options;
        if ("trueFalse".equals(type) || "essay".equals(type)) {
            stem = content.trim();
            options = "trueFalse".equals(type) ? trueFalseOptions() : List.of();
        } else {
            SplitContent split = splitStemAndOptions(content);
            stem = split.stem();
            options = split.options();
            if (stem.isBlank()) {
                errors.add("未能从题目内容中解析题干，请将题干与选项换行");
            }
            if (options.size() < 2) {
                errors.add("未能从题目内容中解析选项，请用 Alt+Enter 换行并按 A．B．C．D 格式填写");
            } else {
                String seqError = sequentialKeysError(options);
                if (seqError != null) {
                    errors.add(seqError);
                }
            }
        }

        List<String> standardAnswer = parseAnswer(type, answerRaw, options, errors);
        if (!errors.isEmpty()) {
            return ParsedRow.fail(errors);
        }
        String explanation = examKind.isBlank() ? null : "试题类型：" + examKind;
        return ParsedRow.ok(type, stem, options, standardAnswer, difficulty, categoryName, knowledgePointName,
                explanation, null);
    }

    private static ParsedRow parseStandardRow(Row row, Map<String, Integer> cols) {
        List<String> errors = new ArrayList<>();
        String categoryName = col(row, cols, "分类");
        String knowledgePointName = blankToNull(col(row, cols, "知识点"));
        String type = mapType(col(row, cols, "题型"));
        String stem = col(row, cols, "题干");
        String answerRaw = col(row, cols, "正确答案");
        String explanation = blankToNull(col(row, cols, "解析"));
        String difficulty = mapDifficulty(firstNonBlank(col(row, cols, "难度"), "中等"));
        String scoreRaw = col(row, cols, "分值");

        if (categoryName.isBlank()) {
            errors.add("分类不能为空");
        }
        if (type == null) {
            errors.add("题型无效，应为 单选 / 多选 / 判断 / 解答题");
        }
        if (stem.isBlank()) {
            errors.add("题干不能为空");
        }
        if (answerRaw.isBlank()) {
            errors.add("正确答案不能为空");
        }
        if (difficulty == null) {
            errors.add("难度无效，应为 简单 / 中等 / 困难");
        }

        List<Map<String, Object>> options = new ArrayList<>();
        if ("trueFalse".equals(type)) {
            for (String key : List.of("A", "B", "C", "D", "E", "F")) {
                if (!col(row, cols, "选项" + key).isBlank()) {
                    errors.add("判断题的选项 A–D 必须为空");
                    break;
                }
            }
            options = trueFalseOptions();
        } else if ("essay".equals(type)) {
            options = List.of();
        } else if (type != null) {
            boolean seenBlank = false;
            for (String key : List.of("A", "B", "C", "D", "E", "F")) {
                String text = col(row, cols, "选项" + key);
                if (text.isBlank()) {
                    seenBlank = true;
                    continue;
                }
                if (seenBlank) {
                    errors.add("选项不得从中间断档");
                    break;
                }
                options.add(option(key, text));
            }
            if (options.size() < 2) {
                errors.add("单选、多选至少需要选项 A、B");
            }
        }

        BigDecimal score = parseScore(scoreRaw, errors);
        if (!errors.isEmpty()) {
            return ParsedRow.fail(errors);
        }
        List<String> standardAnswer = parseAnswer(type, answerRaw, options, errors);
        if (!errors.isEmpty()) {
            return ParsedRow.fail(errors);
        }
        return ParsedRow.ok(type, stem.trim(), options, standardAnswer, difficulty, categoryName.trim(),
                knowledgePointName, explanation, score);
    }

    private static ParsedRow parseJsonRow(Row row, Map<String, Integer> cols) {
        List<String> errors = new ArrayList<>();
        String type = col(row, cols, "type").trim();
        String stem = col(row, cols, "stem");
        String optionsRaw = col(row, cols, "options");
        String standardAnswerRaw = col(row, cols, "standardAnswer");
        String difficultyRaw = col(row, cols, "difficulty").trim();

        if (type.isBlank()) {
            errors.add("type 不能为空");
        } else if (!VALID_TYPES.contains(type)) {
            errors.add("type 无效，应为 singleChoice/multipleChoice/trueFalse/essay");
        }
        if (stem.isBlank()) {
            errors.add("stem 不能为空");
        }
        boolean essay = "essay".equals(type);
        List<Map<String, Object>> options = List.of();
        if (optionsRaw.isBlank()) {
            if (!essay) {
                errors.add("options 不能为空");
            }
        } else {
            try {
                Object parsed = JsonHelper.parse(optionsRaw.trim());
                if (!(parsed instanceof List<?> list) || (!essay && list.isEmpty())) {
                    errors.add(essay ? "options 必须为 JSON 数组" : "options 必须为非空 JSON 数组");
                } else {
                    options = castOptionList(list);
                }
            } catch (Exception e) {
                errors.add("options 不是合法 JSON 数组");
            }
        }
        List<String> standardAnswer = List.of();
        if (standardAnswerRaw.isBlank()) {
            errors.add("standardAnswer 不能为空");
        } else {
            try {
                Object parsed = JsonHelper.parse(standardAnswerRaw.trim());
                if (!(parsed instanceof List<?> list) || list.isEmpty()) {
                    errors.add("standardAnswer 必须为非空 JSON 数组");
                } else {
                    standardAnswer = list.stream().map(String::valueOf).toList();
                }
            } catch (Exception e) {
                errors.add("standardAnswer 不是合法 JSON 数组");
            }
        }
        String difficulty = difficultyRaw.isBlank() ? "medium" : difficultyRaw;
        if (!VALID_DIFFICULTIES.contains(difficulty)) {
            errors.add("difficulty 无效，应为 easy/medium/hard");
        }
        if (!errors.isEmpty()) {
            return ParsedRow.fail(errors);
        }
        return ParsedRow.ok(type, stem.trim(), options, standardAnswer, difficulty, null, null, null, null);
    }

    static SplitContent splitStemAndOptions(String content) {
        String normalized = content.replace("\r\n", "\n").replace('\r', '\n');
        SplitContent fromLines = splitByLines(normalized);
        SplitContent fromInline = splitInlineOptions(normalized);
        return preferRicherSplit(fromLines, fromInline);
    }

    private static SplitContent splitByLines(String normalized) {
        String[] lines = normalized.split("\n", -1);
        int firstOptionLine = -1;
        List<Map<String, Object>> lineOptions = new ArrayList<>();
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) {
                continue;
            }
            List<Map<String, Object>> onLine = optionsOnLine(line);
            if (!onLine.isEmpty()) {
                if (firstOptionLine < 0) {
                    firstOptionLine = i;
                }
                lineOptions.addAll(onLine);
            } else if (firstOptionLine >= 0 && !lineOptions.isEmpty()) {
                Map<String, Object> last = lineOptions.get(lineOptions.size() - 1);
                last.put("text", last.get("text") + " " + line);
            }
        }
        if (firstOptionLine > 0 && lineOptions.size() >= 2) {
            String stem = String.join("\n", java.util.Arrays.copyOfRange(lines, 0, firstOptionLine)).trim();
            return new SplitContent(stem, lineOptions);
        }
        return new SplitContent(normalized.trim(), List.of());
    }

    private static List<Map<String, Object>> optionsOnLine(String line) {
        Matcher inline = INLINE_OPTION.matcher(line);
        List<int[]> marks = new ArrayList<>();
        List<String> keys = new ArrayList<>();
        while (inline.find()) {
            marks.add(new int[] {inline.start(), inline.end()});
            keys.add(inline.group(1));
        }
        if (keys.size() >= 2) {
            List<Map<String, Object>> options = new ArrayList<>();
            for (int i = 0; i < marks.size(); i++) {
                int textStart = marks.get(i)[1];
                int textEnd = i + 1 < marks.size() ? marks.get(i + 1)[0] : line.length();
                String text = line.substring(textStart, textEnd).trim();
                if (!text.isEmpty()) {
                    options.add(option(keys.get(i), text));
                }
            }
            if (options.size() >= 2) {
                return options;
            }
        }
        Matcher labeled = LINE_OPTION.matcher(line);
        if (labeled.matches()) {
            return List.of(option(labeled.group(1), labeled.group(2).trim()));
        }
        Matcher nosep = LINE_OPTION_NOSEP.matcher(line);
        if (nosep.matches()) {
            return List.of(option(nosep.group(1), nosep.group(2).trim()));
        }
        return List.of();
    }

    private static SplitContent preferRicherSplit(SplitContent fromLines, SplitContent fromInline) {
        int lineScore = optionSplitScore(fromLines);
        int inlineScore = optionSplitScore(fromInline);
        if (inlineScore > lineScore) {
            return fromInline;
        }
        if (lineScore > 0) {
            return fromLines;
        }
        return fromInline.options().size() >= 2 ? fromInline : fromLines;
    }

    private static int optionSplitScore(SplitContent split) {
        if (split.options().size() < 2) {
            return 0;
        }
        Object first = split.options().get(0).get("key");
        return "A".equals(String.valueOf(first)) ? split.options().size() : 0;
    }

    private static SplitContent splitInlineOptions(String content) {
        String searchable = content.replace('\u3000', ' ');
        Matcher matcher = INLINE_OPTION.matcher(searchable);
        List<int[]> marks = new ArrayList<>();
        List<String> keys = new ArrayList<>();
        while (matcher.find()) {
            marks.add(new int[] {matcher.start(), matcher.end()});
            keys.add(matcher.group(1));
        }
        if (keys.size() < 2 || !"A".equals(keys.get(0))) {
            return new SplitContent(content.trim(), List.of());
        }
        String stem = searchable.substring(0, marks.get(0)[0]).trim();
        List<Map<String, Object>> options = new ArrayList<>();
        for (int i = 0; i < marks.size(); i++) {
            int textStart = marks.get(i)[1];
            int textEnd = i + 1 < marks.size() ? marks.get(i + 1)[0] : searchable.length();
            String text = searchable.substring(textStart, textEnd).trim();
            if (!text.isEmpty()) {
                options.add(option(keys.get(i), text));
            }
        }
        return new SplitContent(stem, options);
    }

    static List<String> parseAnswer(String type, String raw, List<Map<String, Object>> options, List<String> errors) {
        String trimmed = raw == null ? "" : raw.trim();
        if ("trueFalse".equals(type)) {
            String mapped = mapTrueFalseAnswer(trimmed);
            if (mapped == null) {
                errors.add("判断题答案应为 对/错 或 正确/错误");
                return List.of();
            }
            return List.of(mapped);
        }
        if ("essay".equals(type)) {
            return List.of(trimmed);
        }
        List<String> keys = splitChoiceAnswer(trimmed);
        if (keys.isEmpty()) {
            errors.add("正确答案格式无效，单选填 A，多选填 AC 或 A,C");
            return List.of();
        }
        Set<String> optionKeys = optionKeySet(options);
        for (String key : keys) {
            if (!optionKeys.contains(key)) {
                errors.add("答案引用了未填写的选项 " + key);
            }
        }
        if ("singleChoice".equals(type) && keys.size() != 1) {
            errors.add("单选只能有一个正确答案");
        }
        if ("multipleChoice".equals(type) && keys.size() < 2) {
            errors.add("多选至少需要两个正确答案");
        }
        return keys;
    }

    static List<String> splitChoiceAnswer(String raw) {
        String compact = raw.replace(" ", "").replace("\u3000", "").toUpperCase(Locale.ROOT);
        compact = compact.replace("，", ",").replace("、", ",").replace(";", ",").replace("；", ",");
        if (compact.isEmpty()) {
            return List.of();
        }
        if (compact.contains(",")) {
            List<String> keys = new ArrayList<>();
            for (String part : compact.split(",")) {
                if (!part.isEmpty()) {
                    keys.add(part);
                }
            }
            return keys.stream().allMatch(k -> k.length() == 1 && k.charAt(0) >= 'A' && k.charAt(0) <= 'F')
                    ? keys : List.of();
        }
        if (CHOICE_LETTERS.matcher(compact).matches()) {
            List<String> keys = new ArrayList<>();
            for (int i = 0; i < compact.length(); i++) {
                keys.add(String.valueOf(compact.charAt(i)));
            }
            return keys;
        }
        return List.of();
    }

    static String mapType(String raw) {
        if (raw == null) {
            return null;
        }
        String value = raw.replace(" ", "").trim();
        return switch (value) {
            case "单选", "singleChoice" -> "singleChoice";
            case "多选", "multipleChoice" -> "multipleChoice";
            case "判断", "trueFalse" -> "trueFalse";
            case "解答题", "简答", "essay" -> "essay";
            default -> VALID_TYPES.contains(value) ? value : null;
        };
    }

    static String mapDifficulty(String raw) {
        if (raw == null || raw.isBlank()) {
            return "medium";
        }
        String value = raw.replace(" ", "").replace("\u3000", "").trim();
        return switch (value) {
            case "易", "简单", "easy" -> "easy";
            case "中", "一般", "中等", "medium" -> "medium";
            case "难", "困难", "hard" -> "hard";
            default -> VALID_DIFFICULTIES.contains(value) ? value : null;
        };
    }

    static String mapTrueFalseAnswer(String raw) {
        String value = raw.replace(" ", "").replace("\u3000", "").trim();
        return switch (value) {
            case "对", "正确", "true", "TRUE", "A" -> "A";
            case "错", "错误", "false", "FALSE", "B" -> "B";
            default -> null;
        };
    }

    static String resolveCategory(String level1, String level2, String level3) {
        if (!level1.isBlank()) {
            return level1.trim();
        }
        if (!level2.isBlank()) {
            return level2.trim();
        }
        if (!level3.isBlank()) {
            return level3.trim();
        }
        return null;
    }

    static String resolveKnowledgePoint(String level1, String level2, String level3) {
        if (!level1.isBlank()) {
            if (!level2.isBlank() && !level3.isBlank()) {
                return level2.trim() + "/" + level3.trim();
            }
            if (!level2.isBlank()) {
                return level2.trim();
            }
            if (!level3.isBlank()) {
                return level3.trim();
            }
            return null;
        }
        if (!level2.isBlank() && !level3.isBlank()) {
            return level3.trim();
        }
        return null;
    }

    private static boolean isInstructionRow(Row row, Map<String, Integer> cols, Format format) {
        String typeCell = format == Format.JSON_COLUMNS ? col(row, cols, "type") : col(row, cols, "题型");
        if (mapType(typeCell) != null) {
            return false;
        }
        String joined = new StringBuilder()
                .append(typeCell)
                .append(col(row, cols, "一级科目"))
                .append(col(row, cols, "题目内容"))
                .append(col(row, cols, "题干"))
                .toString();
        return joined.contains("必填") || joined.contains("只能填写") || joined.contains("Alt+Enter")
                || joined.contains("不能跨级");
    }

    private static boolean isEmptyRow(Row row, Map<String, Integer> cols) {
        for (int index : cols.values()) {
            if (!cellValue(row, index).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private static String col(Row row, Map<String, Integer> cols, String name) {
        Integer index = cols.get(name);
        if (index == null) {
            return "";
        }
        return cellValue(row, index);
    }

    static String cellValue(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) {
            return "";
        }
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue() == null ? "" : cell.getStringCellValue().trim();
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> DATA_FORMATTER.formatCellValue(cell).trim();
        };
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static BigDecimal parseScore(String raw, List<String> errors) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            BigDecimal score = new BigDecimal(raw.trim());
            if (score.compareTo(BigDecimal.ZERO) <= 0 || score.scale() > 2) {
                errors.add("分值必须大于 0 且最多两位小数");
                return null;
            }
            return score;
        } catch (NumberFormatException e) {
            errors.add("分值不是合法数字");
            return null;
        }
    }

    private static String sequentialKeysError(List<Map<String, Object>> options) {
        for (int i = 0; i < options.size(); i++) {
            String expected = String.valueOf((char) ('A' + i));
            String actual = String.valueOf(options.get(i).get("key"));
            if (!expected.equals(actual)) {
                return "选项编号必须从 A 起连续，实际为 " + actual;
            }
        }
        return null;
    }

    private static Set<String> optionKeySet(List<Map<String, Object>> options) {
        return options.stream().map(o -> String.valueOf(o.get("key"))).collect(java.util.stream.Collectors.toSet());
    }

    private static List<Map<String, Object>> trueFalseOptions() {
        return List.of(option("A", "正确"), option("B", "错误"));
    }

    private static Map<String, Object> option(String key, String text) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("key", key);
        map.put("text", text);
        return map;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> castOptionList(List<?> list) {
        List<Map<String, Object>> options = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                options.add((Map<String, Object>) map);
            }
        }
        return options;
    }

    private static Map<String, Object> errorRecord(String sheetName, int rowNum, List<String> errors) {
        Map<String, Object> errorRow = new LinkedHashMap<>();
        errorRow.put("sheetName", sheetName);
        errorRow.put("rowNum", rowNum);
        errorRow.put("message", String.join("; ", errors));
        return errorRow;
    }

    private static Map<String, Object> validRecord(String sheetName, int rowNum, ParsedRow parsed) {
        Map<String, Object> validRow = new LinkedHashMap<>();
        validRow.put("sheetName", sheetName);
        validRow.put("rowNum", rowNum);
        validRow.put("type", parsed.type);
        validRow.put("stem", parsed.stem);
        validRow.put("options", parsed.options);
        validRow.put("standardAnswer", parsed.standardAnswer);
        validRow.put("difficulty", parsed.difficulty);
        if (parsed.categoryName != null) {
            validRow.put("categoryName", parsed.categoryName);
        }
        if (parsed.knowledgePointName != null) {
            validRow.put("knowledgePointName", parsed.knowledgePointName);
        }
        if (parsed.explanation != null) {
            validRow.put("explanation", parsed.explanation);
        }
        if (parsed.defaultScore != null) {
            validRow.put("defaultScore", parsed.defaultScore);
        }
        return validRow;
    }

    private enum Format {
        LEGACY_BANK, STANDARD, JSON_COLUMNS, UNKNOWN
    }

    private record ParsedRow(
            String type,
            String stem,
            List<Map<String, Object>> options,
            List<String> standardAnswer,
            String difficulty,
            String categoryName,
            String knowledgePointName,
            String explanation,
            BigDecimal defaultScore,
            List<String> errors
    ) {
        static ParsedRow fail(List<String> errors) {
            return new ParsedRow(null, null, List.of(), List.of(), null, null, null, null, null, errors);
        }

        static ParsedRow ok(
                String type,
                String stem,
                List<Map<String, Object>> options,
                List<String> standardAnswer,
                String difficulty,
                String categoryName,
                String knowledgePointName,
                String explanation,
                BigDecimal defaultScore
        ) {
            return new ParsedRow(type, stem, options, standardAnswer, difficulty, categoryName, knowledgePointName,
                    explanation, defaultScore, List.of());
        }
    }

    record SplitContent(String stem, List<Map<String, Object>> options) {
    }

    record ParseResult(int importableCount, int errorCount, Map<String, Object> preview) {
    }
}

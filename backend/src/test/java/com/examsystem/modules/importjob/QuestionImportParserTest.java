package com.examsystem.modules.importjob;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class QuestionImportParserTest {

    @Test
    void legacyBankParsesStemOptionsCategoryAndTrueFalse() throws Exception {
        byte[] bytes = workbook(wb -> {
            Sheet sheet = wb.createSheet("烟花爆竹");
            header(sheet, "一级科目", "二级科目", "三级科目", "题型", "难易度", "题目内容", "正确答案", "答案选项数量", "试题类型");
            Row hint = sheet.createRow(1);
            hint.createCell(0).setCellValue("必填，一级目录。");
            hint.createCell(3).setCellValue("必填，只能填写“判断、单选、多选”其中之一，不能有空格");
            row(sheet, 2, "", "", "烟花爆竹", "单选", "简单",
                    "批发企业应当（）。\nA及时、妥善销毁\nB立即停止销售\nC自行封存\nD分类存放",
                    "A", "4", "初培、复审");
            row(sheet, 3, "企业主要负责人", "一般行业", "", "多选", "中",
                    "必须执行（）标准。\nA．国家\nB．地方\nC．行业\nD．合同约定\nE．主管部门",
                    "AC", "5", "初培");
            row(sheet, 4, "", "", "烟花爆竹", "判断", "一般",
                    "零售经营者不得采购礼花弹。",
                    "正确", "2", "初培、复审");
        });

        QuestionImportParser.ParseResult result = QuestionImportParser.parse(new ByteArrayInputStream(bytes));
        assertThat(result.importableCount()).isEqualTo(3);
        assertThat(result.errorCount()).isZero();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> valid = (List<Map<String, Object>>) result.preview().get("validRows");
        assertThat(valid.get(0).get("categoryName")).isEqualTo("烟花爆竹");
        assertThat(valid.get(0).get("type")).isEqualTo("singleChoice");
        assertThat(valid.get(0).get("difficulty")).isEqualTo("easy");
        assertThat(valid.get(0).get("standardAnswer")).isEqualTo(List.of("A"));
        assertThat(optionText(valid.get(0), "A")).isEqualTo("及时、妥善销毁");

        assertThat(valid.get(1).get("categoryName")).isEqualTo("企业主要负责人");
        assertThat(valid.get(1).get("knowledgePointName")).isEqualTo("一般行业");
        assertThat(valid.get(1).get("type")).isEqualTo("multipleChoice");
        assertThat(valid.get(1).get("standardAnswer")).isEqualTo(List.of("A", "C"));
        assertThat(optionText(valid.get(1), "E")).isEqualTo("主管部门");

        assertThat(valid.get(2).get("type")).isEqualTo("trueFalse");
        assertThat(valid.get(2).get("standardAnswer")).isEqualTo(List.of("A"));
        assertThat(String.valueOf(valid.get(2).get("stem"))).contains("礼花弹");
    }

    @Test
    void inlineOptionsSeparatedByIdeographicSpacesAreParsed() throws Exception {
        byte[] bytes = workbook(wb -> {
            Sheet sheet = wb.createSheet("危化品");
            header(sheet, "一级科目", "二级科目", "三级科目", "题型", "难易度", "题目内容", "正确答案", "答案选项数量", "试题类型");
            row(sheet, 1, "", "", "危险化学品", "单选", "难",
                    "严禁作为（　）悬挂点使用。　　　　　　A.安全带                                                   B.安全网　　　　　　C.安全锁",
                    "A", "3", "初培、复审");
        });

        QuestionImportParser.ParseResult result = QuestionImportParser.parse(new ByteArrayInputStream(bytes));
        assertThat(result.importableCount()).isEqualTo(1);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> valid = (List<Map<String, Object>>) result.preview().get("validRows");
        assertThat(String.valueOf(valid.get(0).get("stem"))).contains("严禁作为");
        assertThat(optionText(valid.get(0), "A")).contains("安全带");
        assertThat(optionText(valid.get(0), "C")).contains("安全锁");
    }

    @Test
    void standardTemplateParsesSplitOptionColumns() throws Exception {
        byte[] bytes = workbook(wb -> {
            Sheet sheet = wb.createSheet("questions");
            header(sheet, "分类", "知识点", "题型", "题干", "选项A", "选项B", "选项C", "选项D", "正确答案", "解析", "难度", "分值");
            Row data = sheet.createRow(1);
            data.createCell(0).setCellValue("法规");
            data.createCell(1).setCellValue("安全生产法");
            data.createCell(2).setCellValue("单选");
            data.createCell(3).setCellValue("立法目的是？");
            data.createCell(4).setCellValue("安全生产法");
            data.createCell(5).setCellValue("矿山安全法");
            data.createCell(6).setCellValue("消防法");
            data.createCell(7).setCellValue("道路交通安全法");
            data.createCell(8).setCellValue("A");
            data.createCell(9).setCellValue("见第一条");
            data.createCell(10).setCellValue("简单");
            data.createCell(11).setCellValue("2");
        });

        QuestionImportParser.ParseResult result = QuestionImportParser.parse(new ByteArrayInputStream(bytes));
        assertThat(result.importableCount()).isEqualTo(1);
        @SuppressWarnings("unchecked")
        Map<String, Object> row = ((List<Map<String, Object>>) result.preview().get("validRows")).get(0);
        assertThat(row.get("categoryName")).isEqualTo("法规");
        assertThat(row.get("knowledgePointName")).isEqualTo("安全生产法");
        assertThat(row.get("explanation")).isEqualTo("见第一条");
        assertThat(String.valueOf(row.get("defaultScore"))).startsWith("2");
    }

    @Test
    void jsonColumnsRemainCompatible() throws Exception {
        byte[] bytes = workbook(wb -> {
            Sheet sheet = wb.createSheet("questions");
            header(sheet, "type", "stem", "options", "standardAnswer", "difficulty");
            Row data = sheet.createRow(1);
            data.createCell(0).setCellValue("singleChoice");
            data.createCell(1).setCellValue("1+1=?");
            data.createCell(2).setCellValue("[{\"key\":\"A\",\"text\":\"1\"},{\"key\":\"B\",\"text\":\"2\"}]");
            data.createCell(3).setCellValue("[\"B\"]");
            data.createCell(4).setCellValue("easy");
        });

        QuestionImportParser.ParseResult result = QuestionImportParser.parse(new ByteArrayInputStream(bytes));
        assertThat(result.importableCount()).isEqualTo(1);
        assertThat(result.errorCount()).isZero();
    }

    @Test
    void unknownHeaderIsFileLevelError() throws Exception {
        byte[] bytes = workbook(wb -> {
            Sheet sheet = wb.createSheet("questions");
            header(sheet, "wrong");
        });
        assertThatThrownBy(() -> QuestionImportParser.parse(new ByteArrayInputStream(bytes)))
                .hasMessageContaining("表头不正确");
    }

    @Test
    void compactOptionPrefixWithoutSeparatorIsParsed() {
        QuestionImportParser.SplitContent split = QuestionImportParser.splitStemAndOptions(
                "未依据（）设置报警装置。\nAGB50160、GB51283\nBGB50160、GB16808\nCGB/T 50493、GB51283\nDGB/T 50493、GB16808"
        );
        assertThat(split.stem()).contains("报警装置");
        assertThat(split.options()).extracting(o -> o.get("key")).containsExactly("A", "B", "C", "D");
        assertThat(split.options().get(0).get("text")).isEqualTo("GB50160、GB51283");

        QuestionImportParser.SplitContent numeric = QuestionImportParser.splitStemAndOptions(
                "原则上不得超过（）人\nA2\nB3\nC4\nD5"
        );
        assertThat(numeric.options().get(0).get("text")).isEqualTo("2");
        assertThat(numeric.options().get(3).get("text")).isEqualTo("5");
    }

    @Test
    void commaAndCompactMultipleChoiceAnswersSplitToKeys() {
        assertThat(QuestionImportParser.splitChoiceAnswer("A,C")).containsExactly("A", "C");
        assertThat(QuestionImportParser.splitChoiceAnswer("AC")).containsExactly("A", "C");
        assertThat(QuestionImportParser.splitChoiceAnswer("A,B,C,D")).containsExactly("A", "B", "C", "D");
        assertThat(QuestionImportParser.splitChoiceAnswer("ABCDE")).containsExactly("A", "B", "C", "D", "E");
    }

    @Test
    void realLegacyBankFileParsesWhenPresent() throws Exception {
        java.nio.file.Path path = java.nio.file.Path.of(System.getProperty("user.home"), "Downloads", "题库(1).xlsx");
        org.junit.jupiter.api.Assumptions.assumeTrue(java.nio.file.Files.exists(path), "local 题库(1).xlsx not present");
        QuestionImportParser.ParseResult result = QuestionImportParser.parse(java.nio.file.Files.newInputStream(path));
        assertThat(result.importableCount() + result.errorCount()).isGreaterThan(800);
        assertThat(result.importableCount()).isGreaterThan(750);
    }

    private static String optionText(Map<String, Object> row, String key) {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> options = (List<Map<String, Object>>) row.get("options");
        return options.stream()
                .filter(o -> key.equals(String.valueOf(o.get("key"))))
                .map(o -> String.valueOf(o.get("text")))
                .findFirst()
                .orElse("");
    }

    private static void header(Sheet sheet, String... names) {
        Row row = sheet.createRow(0);
        for (int i = 0; i < names.length; i++) {
            row.createCell(i).setCellValue(names[i]);
        }
    }

    private static void row(Sheet sheet, int index, String... values) {
        Row row = sheet.createRow(index);
        for (int i = 0; i < values.length; i++) {
            row.createCell(i).setCellValue(values[i]);
        }
    }

    private interface WorkbookWriter {
        void write(XSSFWorkbook workbook) throws Exception;
    }

    private static byte[] workbook(WorkbookWriter writer) throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            writer.write(workbook);
            workbook.write(out);
            return out.toByteArray();
        }
    }
}

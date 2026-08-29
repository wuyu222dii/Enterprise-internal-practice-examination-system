package com.examsystem.modules.exam;

import com.examsystem.common.ApiResponse;
import com.examsystem.common.MetaFactory;
import com.examsystem.common.PageDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/exams")
public class ExamEmployeeController {

    private final ExamService examService;
    private final MetaFactory metaFactory;

    public ExamEmployeeController(ExamService examService, MetaFactory metaFactory) {
        this.examService = examService;
        this.metaFactory = metaFactory;
    }

    @GetMapping("/tasks")
    public ApiResponse<List<Map<String, Object>>> listTasks() {
        return ApiResponse.ok(examService.listExamTasks(), metaFactory.build());
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> getExam(@PathVariable String id) {
        return ApiResponse.ok(examService.getExamTaskDetail(id), metaFactory.build());
    }

    @GetMapping("/records")
    public ApiResponse<PageDto<Map<String, Object>>> listRecords(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize
    ) {
        return ApiResponse.ok(examService.listExamRecords(page, pageSize), metaFactory.build());
    }
}

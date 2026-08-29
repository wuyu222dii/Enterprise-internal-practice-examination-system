package com.examsystem.common;

import java.util.List;

public record PageDto<T>(List<T> items, long total, int page, int pageSize) {
}

"""
Automated unit tests for C and C++ dead-code analysis (without requiring main()).
"""

import unittest
from analyzer.ast_parser import analyze_code


class TestCCppDeadCodeAnalysis(unittest.TestCase):
    def test_c_clean_code_without_main(self):
        c_code = """
double add(double a, double b) {
    return a + b;
}
double multiply(double x, double y) {
    return x * y;
}
"""
        res = analyze_code(c_code, language="c")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        dead_res = metrics.get("dead_code_result")
        self.assertIsNotNone(dead_res)
        supported = dead_res.get("supported") if isinstance(dead_res, dict) else dead_res.supported
        count = dead_res.get("count") if isinstance(dead_res, dict) else dead_res.count

        self.assertTrue(supported)
        self.assertEqual(count, 0)
        self.assertEqual(metrics["metric_status"]["dead_code_count"]["status"], "available")

    def test_c_unreachable_after_return_without_main(self):
        c_code = """
int compute(int val) {
    return val * 2;
    int dead_var = 100;
}
"""
        res = analyze_code(c_code, language="c")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        dead_res = metrics.get("dead_code_result")
        self.assertIsNotNone(dead_res)
        count = dead_res.get("count") if isinstance(dead_res, dict) else dead_res.count
        findings = dead_res.get("findings") if isinstance(dead_res, dict) else dead_res.findings

        self.assertGreaterEqual(count, 1)
        self.assertEqual(findings[0]["category"], "unreachable-statement")
        self.assertEqual(findings[0]["line"], 4)

    def test_c_unreachable_after_break_and_continue(self):
        c_code = """
void process(int* arr, int size) {
    for (int i = 0; i < size; i++) {
        if (arr[i] < 0) {
            break;
            int dead_in_break = 1;
        }
        if (arr[i] == 0) {
            continue;
            int dead_in_continue = 2;
        }
    }
}
"""
        res = analyze_code(c_code, language="c")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        dead_res = metrics.get("dead_code_result")
        self.assertIsNotNone(dead_res)
        count = dead_res.get("count") if isinstance(dead_res, dict) else dead_res.count
        self.assertGreaterEqual(count, 2)

    def test_c_constant_false_condition(self):
        c_code = """
void test_conditions() {
    if (0) {
        int x = 1;
    }
    while (0) {
        int y = 2;
    }
}
"""
        res = analyze_code(c_code, language="c")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        dead_res = metrics.get("dead_code_result")
        self.assertIsNotNone(dead_res)
        count = dead_res.get("count") if isinstance(dead_res, dict) else dead_res.count
        self.assertGreaterEqual(count, 2)

    def test_cpp_class_and_method_without_main(self):
        cpp_code = """
#include <string>

class Calculator {
public:
    int add(int a, int b) {
        return a + b;
        int dead = 42;
    }
};
"""
        res = analyze_code(cpp_code, language="cpp")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        dead_res = metrics.get("dead_code_result")
        self.assertIsNotNone(dead_res)
        count = dead_res.get("count") if isinstance(dead_res, dict) else dead_res.count
        self.assertGreaterEqual(count, 1)

    def test_cpp_unreachable_after_throw(self):
        cpp_code = """
#include <stdexcept>

void validate(int age) {
    if (age < 0) {
        throw std::invalid_argument("negative age");
        bool invalid = true;
    }
}
"""
        res = analyze_code(cpp_code, language="cpp")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        dead_res = metrics.get("dead_code_result")
        self.assertIsNotNone(dead_res)
        count = dead_res.get("count") if isinstance(dead_res, dict) else dead_res.count
        self.assertGreaterEqual(count, 1)

    def test_cpp_template_and_lambda_without_main(self):
        cpp_code = """
template<typename T>
T identity(T val) {
    return val;
}

void lambda_test() {
    auto sq = [](int x) {
        return x * x;
        int dead = 0;
    };
}
"""
        res = analyze_code(cpp_code, language="cpp")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        dead_res = metrics.get("dead_code_result")
        self.assertIsNotNone(dead_res)
        count = dead_res.get("count") if isinstance(dead_res, dict) else dead_res.count
        self.assertGreaterEqual(count, 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)

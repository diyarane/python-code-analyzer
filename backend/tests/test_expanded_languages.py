"""
Automated test suite for Java, C, C++, Go, and Rust language adapters.
"""

import unittest
from analyzer.ast_parser import analyze_code


class TestExpandedLanguages(unittest.TestCase):
    def test_java_analysis(self):
        java_code = """
public class Calculator {
    public int sum(int[] numbers) {
        int total = 0;
        for (int num : numbers) {
            total += num;
        }
        return total;
    }
}
"""
        res = analyze_code(java_code, language="java", filename="Calculator.java")
        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("language"), "java")
        self.assertIsNotNone(res.get("ast"))
        self.assertEqual(res.get("metrics", {}).get("time_complexity"), "O(n)")
        self.assertIsNone(res.get("metrics", {}).get("dead_code_count"))

        invalid_java = "public class Calc { public int sum( {"
        res_bad = analyze_code(invalid_java, language="java")
        self.assertFalse(res_bad.get("success"))
        self.assertEqual(res_bad.get("error"), "SyntaxError")

    def test_c_analysis(self):
        c_code = """
#include <stdio.h>

int computeSum(int arr[], int n) {
    int total = 0;
    for (int i = 0; i < n; i++) {
        total += arr[i];
    }
    return total;
}
"""
        res = analyze_code(c_code, language="c", filename="main.c")
        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("language"), "c")
        self.assertIsNotNone(res.get("ast"))
        self.assertEqual(res.get("metrics", {}).get("time_complexity"), "O(n)")

        invalid_c = "int main() { for (int i = 0 "
        res_bad = analyze_code(invalid_c, language="c")
        self.assertFalse(res_bad.get("success"))
        self.assertEqual(res_bad.get("error"), "SyntaxError")

    def test_cpp_analysis(self):
        cpp_code = """
#include <iostream>
#include <vector>

int computeSum(const std::vector<int>& numbers) {
    int total = 0;
    for (int num : numbers) {
        total += num;
    }
    return total;
}
"""
        res = analyze_code(cpp_code, language="cpp", filename="main.cpp")
        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("language"), "cpp")
        self.assertIsNotNone(res.get("ast"))
        self.assertEqual(res.get("metrics", {}).get("time_complexity"), "O(n)")

        invalid_cpp = "int main() { std::cout << "
        res_bad = analyze_code(invalid_cpp, language="cpp")
        self.assertFalse(res_bad.get("success"))
        self.assertEqual(res_bad.get("error"), "SyntaxError")

    def test_go_analysis(self):
        go_code = """
package main

import "fmt"

func computeSum(numbers []int) int {
    total := 0
    for _, num := range numbers {
        total += num
    }
    fmt.Println(total)
    return total
}
"""
        res = analyze_code(go_code, language="go", filename="main.go")
        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("language"), "go")
        self.assertIsNotNone(res.get("ast"))
        self.assertEqual(res.get("metrics", {}).get("time_complexity"), "O(n)")

        invalid_go = "package main\nfunc main( {"
        res_bad = analyze_code(invalid_go, language="go")
        self.assertFalse(res_bad.get("success"))
        self.assertEqual(res_bad.get("error"), "SyntaxError")

    def test_rust_analysis(self):
        rust_code = """
fn compute_sum(numbers: &[i32]) -> i32 {
    let mut total = 0;
    for num in numbers {
        total += num;
    }
    total
}
"""
        res = analyze_code(rust_code, language="rust", filename="main.rs")
        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("language"), "rust")
        self.assertIsNotNone(res.get("ast"))
        self.assertEqual(res.get("metrics", {}).get("time_complexity"), "O(n)")

        invalid_rust = "fn main() { let mut x = ; }"
        res_bad = analyze_code(invalid_rust, language="rust")
        self.assertFalse(res_bad.get("success"))
        self.assertEqual(res_bad.get("error"), "SyntaxError")


if __name__ == "__main__":
    unittest.main(verbosity=2)

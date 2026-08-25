"""
Automated test suite for Multi-Language State Synchronization & AST Tree Generation.
"""

import unittest
from analyzer.ast_parser import analyze_code


MOCK_SAMPLES = {
    "python": """def find_duplicates(arr):
    duplicates = []
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            if arr[i] == arr[j] and arr[i] not in duplicates:
                duplicates.append(arr[i])
    return duplicates
""",
    "javascript": """function findDuplicates(arr) {
    const duplicates = [];
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {
                duplicates.push(arr[i]);
            }
        }
    }
    return duplicates;
}
""",
    "javascript_jsx": """import React, { useState } from 'react';

export function DuplicateFinder({ items }) {
    const [duplicates, setDuplicates] = useState([]);
    return <div className="box">{duplicates.length}</div>;
}
""",
    "typescript": """function findDuplicates(arr: number[]): number[] {
    const duplicates: number[] = [];
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {
                duplicates.push(arr[i]);
            }
        }
    }
    return duplicates;
}
""",
    "typescript_tsx": """import React from 'react';

interface Props { title: string; }
export const Card: React.FC<Props> = ({ title }) => <div>{title}</div>;
""",
    "java": """public class DuplicateFinder {
    public static int countDuplicates(int[] arr) {
        int count = 0;
        for (int i = 0; i < arr.length; i++) {
            for (int j = i + 1; j < arr.length; j++) {
                if (arr[i] == arr[j]) { count++; break; }
            }
        }
        return count;
    }
}
""",
    "c": """#include <stdio.h>

int findDuplicates(int arr[], int size) {
    int count = 0;
    for (int i = 0; i < size; i++) {
        for (int j = i + 1; j < size; j++) {
            if (arr[i] == arr[j]) { count++; break; }
        }
    }
    return count;
}
""",
    "cpp": """#include <iostream>
#include <vector>

std::vector<int> findDuplicates(const std::vector<int>& arr) {
    std::vector<int> duplicates;
    for (size_t i = 0; i < arr.size(); ++i) {
        for (size_t j = i + 1; j < arr.size(); ++j) {
            if (arr[i] == arr[j]) { duplicates.push_back(arr[i]); break; }
        }
    }
    return duplicates;
}
""",
    "go": """package main

func findDuplicates(arr []int) []int {
    var duplicates []int
    for i := 0; i < len(arr); i++ {
        for j := i + 1; j < len(arr); j++ {
            if arr[i] == arr[j] { duplicates = append(duplicates, arr[i]); break }
        }
    }
    return duplicates;
}
""",
    "rust": """fn find_duplicates(arr: &[i32]) -> Vec<i32> {
    let mut duplicates = Vec::new();
    for i in 0..arr.len() {
        for j in (i + 1)..arr.len() {
            if arr[i] == arr[j] { duplicates.push(arr[i]); break; }
        }
    }
    duplicates
}
""",
}


class TestMultiLanguageState(unittest.TestCase):
    def test_all_mock_samples_parse_and_generate_ast(self):
        for lang_id, code in MOCK_SAMPLES.items():
            res = analyze_code(code, language=lang_id)
            self.assertTrue(res.get("success"), f"Analysis failed for mock sample: {lang_id}")
            self.assertIsNotNone(res.get("ast"), f"AST missing for mock sample: {lang_id}")
            self.assertGreater(res.get("node_count", 0), 0, f"Node count 0 for mock sample: {lang_id}")
            self.assertIn("time_complexity", res.get("metrics", {}))
            self.assertIn("summary", res.get("explanations", {}))

    def test_syntax_errors_are_language_aware(self):
        invalid_samples = [
            ("python", "def bad_fn(: pass", "Python"),
            ("javascript", "function badFn( {", "JavaScript"),
            ("typescript", "const badFn = (x: number: => {", "TypeScript"),
            ("java", "public class Bad { public static void ( {", "Java"),
            ("c", "int main( { for (", "C"),
            ("cpp", "int main( { std::cout <<", "C++"),
            ("go", "package main\nfunc ( {", "Go"),
            ("rust", "fn main( { let mut = ;", "Rust"),
        ]

        for lang_id, bad_code, expected_label in invalid_samples:
            res = analyze_code(bad_code, language=lang_id)
            self.assertFalse(res.get("success"), f"Expected failure for {lang_id}")
            self.assertEqual(res.get("error"), "SyntaxError")
            self.assertIsNotNone(res.get("line"))


if __name__ == "__main__":
    unittest.main(verbosity=2)

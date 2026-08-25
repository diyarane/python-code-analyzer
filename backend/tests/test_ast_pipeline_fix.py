"""
Automated test suite for AST Visualization Pipeline and Derived Node Count Validation.
"""

import unittest
from analyzer.ast_parser import analyze_code


class TestAstPipelineFix(unittest.TestCase):
    def test_all_supported_languages_produce_valid_ast(self):
        samples = [
            ("python", "def fn():\n    for i in range(5):\n        print(i)"),
            ("javascript", "function fn() {\n    for (let i = 0; i < 5; i++) {\n        console.log(i);\n    }\n}"),
            ("typescript", "function fn(x: number): void {\n    if (x > 0) {\n        console.log(x);\n    }\n}"),
            ("java", "public class Main {\n    public static void main(String[] args) {\n        System.out.println(42);\n    }\n}"),
            ("c", "#include <stdio.h>\nint main() {\n    printf(\"hi\");\n    return 0;\n}"),
            ("cpp", "#include <iostream>\nint main() {\n    std::cout << 42;\n    return 0;\n}"),
            ("go", "package main\nimport \"fmt\"\nfunc main() {\n    fmt.Println(42)\n}"),
            ("rust", "fn main() {\n    println!(\"hi\");\n}"),
        ]

        for lang, code in samples:
            res = analyze_code(code, language=lang)
            self.assertTrue(res.get("success"), f"Analysis failed for {lang}")
            ast_tree = res.get("ast")
            self.assertIsNotNone(ast_tree, f"AST missing for {lang}")
            self.assertIn("type", ast_tree)
            self.assertIn("line", ast_tree)
            self.assertIn("children", ast_tree)
            self.assertGreater(res.get("node_count", 0), 0, f"Node count zero for {lang}")


if __name__ == "__main__":
    unittest.main(verbosity=2)

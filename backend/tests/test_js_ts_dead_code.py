"""
Automated unit tests for JavaScript, JSX, TypeScript, TSX, and Python dead-code analysis.
"""

import unittest
from analyzer.ast_parser import analyze_code


class TestJsTsDeadCodeAnalysis(unittest.TestCase):
    def test_js_clean_code(self):
        js_code = """
function add(a, b) {
    return a + b;
}
export function main() {
    return add(2, 3);
}
"""
        res = analyze_code(js_code, language="javascript")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        dead_res = metrics.get("dead_code_result")
        self.assertIsNotNone(dead_res)
        self.assertTrue(dead_res["supported"])
        self.assertEqual(dead_res["count"], 0)
        self.assertEqual(len(dead_res["findings"]), 0)
        self.assertEqual(metrics["metric_status"]["dead_code_count"]["status"], "available")

    def test_js_unreachable_after_return(self):
        js_code = """
function compute() {
    return 42;
    console.log("unreachable");
    let x = 10;
}
"""
        res = analyze_code(js_code, language="javascript")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        dead_res = metrics.get("dead_code_result")
        self.assertIsNotNone(dead_res)
        self.assertTrue(dead_res["supported"])
        self.assertGreaterEqual(dead_res["count"], 1)
        finding = dead_res["findings"][0]
        self.assertEqual(finding["category"], "unreachable-statement")
        self.assertIn("Unreachable statement", finding["message"])
        self.assertEqual(finding["line"], 4)

    def test_js_unreachable_after_throw(self):
        js_code = """
function check(val) {
    if (val < 0) {
        throw new Error("negative");
        let invalid = true;
    }
    return val;
}
"""
        res = analyze_code(js_code, language="javascript")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        dead_res = metrics.get("dead_code_result")
        self.assertIsNotNone(dead_res)
        self.assertGreaterEqual(dead_res["count"], 1)

    def test_js_unreachable_branch(self):
        js_code = """
function test() {
    if (false) {
        console.log("dead branch");
    }
    return 1;
}
"""
        res = analyze_code(js_code, language="javascript")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        dead_res = metrics.get("dead_code_result")
        self.assertIsNotNone(dead_res)
        self.assertGreaterEqual(dead_res["count"], 1)
        finding = dead_res["findings"][0]
        self.assertEqual(finding["category"], "unreachable-branch")

    def test_ts_interfaces_and_types_not_flagged(self):
        ts_code = """
interface User {
    id: number;
    name: string;
}
type Point = { x: number; y: number };

export function getUser(): User {
    return { id: 1, name: "Alice" };
}
"""
        res = analyze_code(ts_code, language="typescript")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        dead_res = metrics.get("dead_code_result")
        self.assertIsNotNone(dead_res)
        self.assertTrue(dead_res["supported"])
        self.assertEqual(dead_res["count"], 0)

    def test_tsx_unreachable_statement(self):
        tsx_code = """
import React from 'react';

export const MyComponent: React.FC = () => {
    return <div>Hello World</div>;
    const deadVar = "never executed";
};
"""
        res = analyze_code(tsx_code, language="typescript_tsx")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        dead_res = metrics.get("dead_code_result")
        self.assertIsNotNone(dead_res)
        self.assertGreaterEqual(dead_res["count"], 1)

    def test_python_unreachable_branch_and_return(self):
        py_code = """
def process(data):
    if False:
        print("dead branch")
    return data
    print("unreachable return")
"""
        res = analyze_code(py_code, language="python")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        dead_res = metrics.get("dead_code_result")
        self.assertIsNotNone(dead_res)
        supported = dead_res.get("supported") if isinstance(dead_res, dict) else dead_res.supported
        count = dead_res.get("count") if isinstance(dead_res, dict) else dead_res.count

        self.assertTrue(supported)
        self.assertGreaterEqual(count, 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)

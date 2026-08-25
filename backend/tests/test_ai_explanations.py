"""
Automated test suite for Language-Aware AI Explanation System.
Ensures explanations use language-native terminology and respect unsupported metrics.
"""

import unittest
from analyzer.ast_parser import analyze_code


class TestAiExplanations(unittest.TestCase):
    def test_python_ai_explanation(self):
        py_code = "def add(a, b):\n    return a + b"
        res = analyze_code(py_code, language="python")
        self.assertTrue(res.get("success"))
        exp = res.get("explanations", {})
        self.assertIn("summary", exp)
        self.assertIn("time", exp)
        self.assertIn("space", exp)
        self.assertIn("optimization", exp)
        self.assertIn("dead-code", exp["summary"].lower())

    def test_javascript_ai_explanation(self):
        js_code = "const add = (a, b) => a + b;"
        res = analyze_code(js_code, language="javascript")
        self.assertTrue(res.get("success"))
        exp = res.get("explanations", {})
        self.assertIn("JavaScript", exp["summary"])
        self.assertIn("dead-code analysis", exp["summary"].lower())
        self.assertNotIn("python", exp["summary"].lower())

    def test_typescript_ai_explanation(self):
        ts_code = "interface User { id: number; }\nconst get = (u: User) => u.id;"
        res = analyze_code(ts_code, language="typescript")
        self.assertTrue(res.get("success"))
        exp = res.get("explanations", {})
        self.assertIn("TypeScript", exp["summary"])
        self.assertIn("interface", exp["summary"].lower())
        self.assertIn("dead-code analysis", exp["summary"].lower())
        self.assertNotIn("python", exp["summary"].lower())

    def test_tsx_ai_explanation(self):
        tsx_code = "interface Props { title: string; }\nexport const Card: React.FC<Props> = ({ title }) => <div>{title}</div>;"
        res = analyze_code(tsx_code, language="typescript_tsx")
        self.assertTrue(res.get("success"))
        exp = res.get("explanations", {})
        self.assertIn("TypeScript/TSX", exp["summary"])
        self.assertIn("dead-code analysis", exp["summary"].lower())


if __name__ == "__main__":
    unittest.main(verbosity=2)

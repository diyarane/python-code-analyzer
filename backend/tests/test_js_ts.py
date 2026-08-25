"""
Comprehensive test suite for JavaScript, JSX, TypeScript, and TSX language adapters.
"""

import unittest
from analyzer.ast_parser import analyze_code


class TestJavaScriptTypeScriptAdapters(unittest.TestCase):
    def test_valid_javascript_analysis(self):
        js_code = """
const calculateTotal = (items) => {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
        total += items[i];
    }
    return total;
};
"""
        res = analyze_code(js_code, language="javascript")
        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("language"), "javascript")
        self.assertIsNotNone(res.get("ast"))
        self.assertEqual(res.get("metrics", {}).get("time_complexity"), "O(n)")
        self.assertEqual(res.get("metrics", {}).get("max_loop_depth"), 1)
        self.assertIsNone(res.get("metrics", {}).get("dead_code_count"))

        # Verify line numbers in AST nodes
        ast_tree = res.get("ast")
        self.assertIn("line", ast_tree)
        self.assertIn("end_line", ast_tree)

    def test_valid_jsx_analysis(self):
        jsx_code = """
const Button = ({ label, onClick }) => {
    return (
        <button className="primary-btn" onClick={onClick}>
            {label}
        </button>
    );
};
export default Button;
"""
        res = analyze_code(jsx_code, language="javascript_jsx", filename="Button.jsx")
        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("language"), "javascript_jsx")
        self.assertIsNotNone(res.get("ast"))

    def test_valid_typescript_analysis(self):
        ts_code = """
interface User {
    id: number;
    name: string;
}

type UserRole = "admin" | "user";

function getUserRole(user: User): UserRole {
    if (user.id === 1) {
        return "admin";
    }
    return "user";
}
"""
        res = analyze_code(ts_code, language="typescript", filename="user.ts")
        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("language"), "typescript")
        self.assertIsNotNone(res.get("ast"))
        self.assertEqual(res.get("metrics", {}).get("time_complexity"), "O(1)")

    def test_valid_tsx_analysis(self):
        tsx_code = """
interface CardProps {
    title: string;
}

export const Card: React.FC<CardProps> = ({ title }) => {
    return <div className="card">{title}</div>;
};
"""
        res = analyze_code(tsx_code, language="typescript_tsx", filename="Card.tsx")
        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("language"), "typescript_tsx")
        self.assertIsNotNone(res.get("ast"))

    def test_invalid_javascript_syntax(self):
        invalid_js = "const x = ;"
        res = analyze_code(invalid_js, language="javascript")
        self.assertFalse(res.get("success"))
        self.assertEqual(res.get("error"), "SyntaxError")
        self.assertIsNotNone(res.get("line"))

    def test_invalid_typescript_syntax(self):
        invalid_ts = "interface User { id: ; }"
        res = analyze_code(invalid_ts, language="typescript")
        self.assertFalse(res.get("success"))
        self.assertEqual(res.get("error"), "SyntaxError")
        self.assertIsNotNone(res.get("line"))

    def test_nested_loop_complexity(self):
        nested_js = """
function findPairs(arr) {
    for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr.length; j++) {
            console.log(arr[i], arr[j]);
        }
    }
}
"""
        res = analyze_code(nested_js, language="javascript")
        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("metrics", {}).get("time_complexity"), "O(n²)")
        self.assertEqual(res.get("metrics", {}).get("max_loop_depth"), 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)

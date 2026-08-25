"""
Automated test suite for Language-Independent AST Visualization Tree Serialization.
Ensures Python, JavaScript, and TypeScript produce node-type-accurate, line-mapped AST trees.
"""

import unittest
from analyzer.ast_parser import analyze_code


class TestAstVisualization(unittest.TestCase):
    def test_python_ast_tree_structure(self):
        py_code = """def outer(items):
    def inner(x):
        if x > 0:
            return x * 2
        return 0

    total = 0
    for item in items:
        total += inner(item)
    return total
"""
        res = analyze_code(py_code, language="python")
        self.assertTrue(res.get("success"))
        ast_tree = res.get("ast")
        self.assertIsNotNone(ast_tree)
        self.assertEqual(ast_tree.get("type"), "Module")
        self.assertIn("line", ast_tree)
        self.assertIn("children", ast_tree)

        # Ensure child nodes contain line numbers and valid display labels
        children = ast_tree.get("children", [])
        self.assertGreater(len(children), 0)
        fn_node = children[0]
        self.assertEqual(fn_node.get("type"), "FunctionDef")
        self.assertEqual(fn_node.get("label"), "FunctionDef: outer")
        self.assertEqual(fn_node.get("line"), 1)

    def test_javascript_ast_tree_structure(self):
        js_code = """function outer(items) {
    const inner = (x) => {
        if (x > 0) {
            return x * 2;
        }
        return 0;
    };

    let total = 0;
    for (let i = 0; i < items.length; i++) {
        total += inner(items[i]);
    }
    return total;
}
"""
        res = analyze_code(js_code, language="javascript")
        self.assertTrue(res.get("success"))
        ast_tree = res.get("ast")
        self.assertIsNotNone(ast_tree)
        self.assertEqual(ast_tree.get("type"), "Program")
        self.assertIn("line", ast_tree)
        self.assertIn("end_line", ast_tree)

        # Ensure JavaScript terminology is human readable
        children = ast_tree.get("children", [])
        self.assertGreater(len(children), 0)
        fn_node = children[0]
        self.assertEqual(fn_node.get("type"), "FunctionDeclaration")
        self.assertEqual(fn_node.get("label"), "Function: outer")
        self.assertEqual(fn_node.get("line"), 1)

    def test_typescript_ast_tree_structure(self):
        ts_code = """interface User {
    id: number;
    name: string;
}

function processUser(u: User): boolean {
    if (u.id > 0) {
        console.log(u.name);
        return true;
    }
    return false;
}
"""
        res = analyze_code(ts_code, language="typescript")
        self.assertTrue(res.get("success"))
        ast_tree = res.get("ast")
        self.assertIsNotNone(ast_tree)
        self.assertEqual(ast_tree.get("type"), "Program")

        # Verify interface and function nodes exist in tree
        children = ast_tree.get("children", [])
        self.assertGreaterEqual(len(children), 2)
        
        interface_node = children[0]
        self.assertEqual(interface_node.get("type"), "InterfaceDeclaration")
        self.assertEqual(interface_node.get("label"), "Interface: User")
        self.assertEqual(interface_node.get("line"), 1)

        fn_node = children[1]
        self.assertEqual(fn_node.get("type"), "FunctionDeclaration")
        self.assertEqual(fn_node.get("label"), "Function: processUser")
        self.assertEqual(fn_node.get("line"), 6)


if __name__ == "__main__":
    unittest.main(verbosity=2)

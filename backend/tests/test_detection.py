"""
Comprehensive test suite for LanguageDetectionService.
Uses standard library `unittest` so it runs anywhere without external dependencies.
"""

import unittest
from analyzer.detection import detector


class TestLanguageDetection(unittest.TestCase):
    def test_python_file_detection(self):
        res = detector.detect(source_code="x = 10", filename="main.py")
        self.assertEqual(res.language, "python")
        self.assertEqual(res.display_name, "Python")
        self.assertEqual(res.source, "extension")
        self.assertEqual(res.confidence, 0.95)
        self.assertTrue(res.supported)

    def test_javascript_file_detection(self):
        res = detector.detect(source_code="console.log('hi');", filename="app.js")
        self.assertEqual(res.language, "javascript")
        self.assertEqual(res.display_name, "JavaScript")
        self.assertEqual(res.source, "extension")
        self.assertEqual(res.confidence, 0.95)
        self.assertTrue(res.supported)

    def test_typescript_file_detection(self):
        res_ts = detector.detect(source_code="const x: number = 5;", filename="index.ts")
        self.assertEqual(res_ts.language, "typescript")
        self.assertEqual(res_ts.display_name, "TypeScript")
        self.assertEqual(res_ts.source, "extension")
        self.assertEqual(res_ts.confidence, 0.95)
        self.assertTrue(res_ts.supported)

        res_tsx = detector.detect(source_code="const Component: React.FC = () => <div />;", filename="Widget.tsx")
        self.assertEqual(res_tsx.language, "typescript_tsx")
        self.assertEqual(res_tsx.display_name, "TypeScript/TSX")
        self.assertEqual(res_tsx.source, "extension")
        self.assertEqual(res_tsx.confidence, 0.95)
        self.assertTrue(res_tsx.supported)

    def test_unknown_extension(self):
        res = detector.detect(source_code="some random text", filename="file.unknown")
        self.assertIn(res.source, ["content", "unknown"])
        if res.source == "unknown":
            self.assertEqual(res.language, "unknown")
            self.assertEqual(res.confidence, 0.0)

    def test_pasted_python_detection(self):
        python_code = """
def calculate_total(items):
    total = 0
    for item in items:
        total += item
    return total
"""
        res = detector.detect(source_code=python_code)
        self.assertEqual(res.language, "python")
        self.assertEqual(res.source, "content")
        self.assertGreaterEqual(res.confidence, 0.70)
        self.assertTrue(res.supported)

    def test_pasted_javascript_detection(self):
        js_code = """
const calculateTotal = (items) => {
    let total = 0;
    items.forEach(item => total += item);
    console.log(total);
    return total;
};
export default calculateTotal;
"""
        res = detector.detect(source_code=js_code)
        self.assertEqual(res.language, "javascript")
        self.assertEqual(res.source, "content")
        self.assertGreaterEqual(res.confidence, 0.65)
        self.assertTrue(res.supported)

    def test_ambiguous_unknown_code(self):
        ambiguous_code = "123456789"
        res = detector.detect(source_code=ambiguous_code)
        self.assertEqual(res.language, "unknown")
        self.assertEqual(res.display_name, "Unknown")
        self.assertEqual(res.source, "unknown")
        self.assertEqual(res.confidence, 0.0)
        self.assertFalse(res.supported)

    def test_explicit_language_override(self):
        # Explicit request 'javascript' even when file extension is .py
        res = detector.detect(source_code="print('hello')", filename="test.py", requested_language="javascript")
        self.assertEqual(res.language, "javascript")
        self.assertEqual(res.display_name, "JavaScript")
        self.assertEqual(res.source, "manual")
        self.assertEqual(res.confidence, 1.0)
        self.assertTrue(res.supported)

        # Explicit request 'python' when filename is app.js
        res_py = detector.detect(source_code="console.log('hi')", filename="app.js", requested_language="python")
        self.assertEqual(res_py.language, "python")
        self.assertEqual(res_py.display_name, "Python")
        self.assertEqual(res_py.source, "manual")
        self.assertEqual(res_py.confidence, 1.0)
        self.assertTrue(res_py.supported)


if __name__ == "__main__":
    unittest.main(verbosity=2)

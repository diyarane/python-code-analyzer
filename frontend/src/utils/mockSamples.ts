/**
 * Mock sample source code definitions for all supported languages in CodeAnalyzer AI.
 * Every sample is valid syntax for its language and includes an intentional dead-code pattern.
 */

export const MOCK_SAMPLES: Record<string, string> = {
  python: `# Mock sample loaded
def find_duplicates(arr):
    duplicates = []
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            if arr[i] == arr[j] and arr[i] not in duplicates:
                duplicates.append(arr[i])
    return duplicates
    unused_cleanup = True
`,
  javascript: `// Mock sample loaded
function findDuplicates(arr) {
    const duplicates = [];
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {
                duplicates.push(arr[i]);
            }
        }
    }
    return duplicates;
    const unusedCleanup = true;
}
`,
  javascript_jsx: `// Mock sample loaded
import React, { useState } from 'react';

export function DuplicateFinder({ items }) {
    const [duplicates, setDuplicates] = useState([]);

    const computeDuplicates = () => {
        const result = [];
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                if (items[i] === items[j] && !result.includes(items[i])) {
                    result.push(items[i]);
                }
            }
        }
        setDuplicates(result);
        return;
        const unreachableNotice = "JSX render complete";
    };

    return (
        <div className="finder-box">
            <button onClick={computeDuplicates}>Find Duplicates</button>
            <ul>
                {duplicates.map((dup, idx) => (
                    <li key={idx}>{dup}</li>
                ))}
            </ul>
        </div>
    );
}
`,
  typescript: `// Mock sample loaded
function findDuplicates(arr: number[]): number[] {
    const duplicates: number[] = [];
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {
                duplicates.push(arr[i]);
            }
        }
    }
    return duplicates;
    const unusedCleanup: boolean = true;
}
`,
  typescript_tsx: `// Mock sample loaded
import React, { useState } from 'react';

interface Props {
    items: number[];
}

export const DuplicateFinder: React.FC<Props> = ({ items }) => {
    const [duplicates, setDuplicates] = useState<number[]>([]);

    const computeDuplicates = (): void => {
        const result: number[] = [];
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                if (items[i] === items[j] && !result.includes(items[i])) {
                    result.push(items[i]);
                }
            }
        }
        setDuplicates(result);
        return;
        const unreachableNotice: string = "TSX render complete";
    };

    return (
        <div className="finder-box">
            <button onClick={computeDuplicates}>Find Duplicates</button>
            <ul>
                {duplicates.map((dup, idx) => (
                    <li key={idx}>{dup}</li>
                ))}
            </ul>
        </div>
    );
};
`,
  java: `// Mock sample loaded
public class DuplicateFinder {
    public static int[] findDuplicates(int[] arr) {
        int[] result = new int[arr.length];
        int count = 0;
        for (int i = 0; i < arr.length; i++) {
            for (int j = i + 1; j < arr.length; j++) {
                if (arr[i] == arr[j]) {
                    result[count++] = arr[i];
                    break;
                }
            }
        }
        return result;
        int unusedCleanup = 0;
    }
}
`,
  c: `// Mock sample loaded
#include <stdio.h>

int findDuplicates(int arr[], int size) {
    int count = 0;
    for (int i = 0; i < size; i++) {
        for (int j = i + 1; j < size; j++) {
            if (arr[i] == arr[j]) {
                count++;
                break;
            }
        }
    }
    return count;
    int unused_cleanup = 0;
}
`,
  cpp: `// Mock sample loaded
#include <iostream>
#include <vector>

std::vector<int> findDuplicates(const std::vector<int>& arr) {
    std::vector<int> duplicates;
    for (size_t i = 0; i < arr.size(); ++i) {
        for (size_t j = i + 1; j < arr.size(); ++j) {
            if (arr[i] == arr[j]) {
                duplicates.push_back(arr[i]);
                break;
            }
        }
    }
    return duplicates;
    int unused_cleanup = 0;
}
`,
  go: `// Mock sample loaded
package main

func findDuplicates(arr []int) []int {
    var duplicates []int
    for i := 0; i < len(arr); i++ {
        for j := i + 1; j < len(arr); j++ {
            if arr[i] == arr[j] {
                duplicates = append(duplicates, arr[i])
                break
            }
        }
    }
    return duplicates
    _ = 0
}
`,
  rust: `// Mock sample loaded
fn find_duplicates(arr: &[i32]) -> Vec<i32> {
    let mut duplicates = Vec::new();
    for i in 0..arr.len() {
        for j in (i + 1)..arr.len() {
            if arr[i] == arr[j] {
                duplicates.push(arr[i]);
                break;
            }
        }
    }
    return duplicates;
    let _unused_cleanup = 0;
}
`,
};

export const getMockSample = (langId: string): string => {
  const cleanId = (langId || 'python').toLowerCase().trim();
  return MOCK_SAMPLES[cleanId] || MOCK_SAMPLES['python'];
};

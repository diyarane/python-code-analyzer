import os
import sys

# Unused import
import json

def unused_function():
    """This function is never called."""
    x = 10  # Unused variable
    return x

def used_function(n):
    """This function is called."""
    result = []
    for i in range(n):
        result.append(i * 2)
    return result

def nested_loops(n):
    """Function with nested loops."""
    count = 0
    for i in range(n):
        for j in range(n):
            for k in range(n):
                count += 1
    return count

def recursive_function(n):
    """Recursive function."""
    if n <= 0:
        return 0
    return n + recursive_function(n - 1)

def recursive_with_loop(n):
    """Recursive function with loops."""
    if n <= 0:
        return []
    result = []
    for i in range(n):
        result.append(i)
    return result + recursive_with_loop(n - 1)

def simple_function():
    """Simple O(1) function."""
    return 42

# Main execution
if __name__ == "__main__":
    result = used_function(10)
    print(result)
    print(nested_loops(5))
    print(recursive_function(5))

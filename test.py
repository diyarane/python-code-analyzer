def foo(n):
    for i in range(n):
        print(i)

def bar(n):
    for i in range(n):
        for j in range(n):
            print(i, j)

def rec(n):
    if n == 0:
        return
    rec(n-1)

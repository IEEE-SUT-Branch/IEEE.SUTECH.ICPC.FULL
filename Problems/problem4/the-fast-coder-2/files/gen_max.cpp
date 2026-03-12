#include "testlib.h"
#include <iostream>

using namespace std;

int main(int argc, char* argv[]) {
    registerGen(argc, argv, 1);

    int n = 100000;
    long long m = 1000000000LL;

    cout << n << " " << m << "\n";
    for (int i = 0; i < n; i++) {
        cout << 10000;
        if (i < n - 1) cout << " ";
    }
    cout << "\n";
    return 0;
}
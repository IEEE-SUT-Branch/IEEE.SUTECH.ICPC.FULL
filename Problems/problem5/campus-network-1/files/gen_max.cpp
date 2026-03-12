#include "testlib.h"
#include <iostream>

using namespace std;

int main(int argc, char* argv[]) {
    registerGen(argc, argv, 1);
    int r = 1000, c = 1000;
    cout << r << " " << c << "\n";
    for (int i = 0; i < r; i++) {
        for (int j = 0; j < c; j++) cout << ".";
        cout << "\n";
    }
    return 0;
}
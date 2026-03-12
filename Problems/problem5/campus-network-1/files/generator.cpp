#include "testlib.h"
#include <iostream>

using namespace std;

int main(int argc, char* argv[]) {
    registerGen(argc, argv, 1);

    int r = rnd.next(1, 1000);
    int c = rnd.next(1, 1000);
    int prob = rnd.next(10, 40);

    cout << r << " " << c << "\n";
    for (int i = 0; i < r; i++) {
        for (int j = 0; j < c; j++) {
            if ((i == 0 && j == 0) || (i == r - 1 && j == c - 1)) {
                cout << ".";
            } else {
                cout << (rnd.next(1, 100) <= prob ? "#" : ".");
            }
        }
        cout << "\n";
    }
    return 0;
}
#include "testlib.h"
#include <string>

using namespace std;

int main(int argc, char* argv[]) {
    registerValidation(argc, argv);

    int r = inf.readInt(1, 1000, "R");
    inf.readSpace();
    int c = inf.readInt(1, 1000, "C");
    inf.readEoln();

    for (int i = 0; i < r; i++) {
        string s = inf.readToken("[.#]{" + to_string(c) + "}", "row");
        inf.readEoln();
        if (i == 0) ensuref(s[0] == '.', "Start must be empty space");
        if (i == r - 1) ensuref(s[c-1] == '.', "End must be empty space");
    }
    
    inf.readEof();
    return 0;
}
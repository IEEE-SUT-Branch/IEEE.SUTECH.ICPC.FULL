#include "testlib.h"

using namespace std;

int main(int argc, char* argv[]) {
    registerValidation(argc, argv);

    int n = inf.readInt(3, 100000, "n");
    inf.readEoln();

    for(int i = 0; i < n; i++) {
        inf.readInt(1, 10000, "s_i");
        if (i < n - 1) inf.readSpace();
    }
    inf.readEoln();
    
    inf.readEof();
    return 0;
}

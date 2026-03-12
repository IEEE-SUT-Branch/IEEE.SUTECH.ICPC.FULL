#include "testlib.h"

using namespace std;

int main(int argc, char* argv[]) {
    registerValidation(argc, argv);

    int n = inf.readInt(1, 100000, "N");
    inf.readSpace();

    inf.readLong(1LL, 1000000000LL, "M");
    inf.readEoln();
    
    for (int i = 0; i < n; i++) {
        inf.readInt(1, 10000, "T_i");
        if (i < n - 1) inf.readSpace();
    }
    inf.readEoln();
    
    inf.readEof();
    return 0;
}
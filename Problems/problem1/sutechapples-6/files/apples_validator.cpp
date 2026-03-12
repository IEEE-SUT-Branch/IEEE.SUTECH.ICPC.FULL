#include "testlib.h"

using namespace std;

int main(int argc, char* argv[]) {

    registerValidation(argc, argv);

    int n = inf.readInt(1, 100, "N");
    inf.readSpace();
    int x = inf.readInt(1, 100, "X");
    inf.readEoln(); 

    // قراءة المصفوفة A_i
    for (int i = 0; i < n; i++) {
        inf.readInt(1, 100, "A_i");
        if (i < n - 1) {
            inf.readSpace(); 
        }
    }
    inf.readEoln();
    inf.readEof();
    return 0;
}

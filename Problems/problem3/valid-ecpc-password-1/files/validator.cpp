#include "testlib.h"

using namespace std;

int main(int argc, char* argv[]) {
    registerValidation(argc, argv);

    inf.readToken("[a-zA-Z0-9]{1,100}", "P");
    inf.readEoln();
    inf.readEof();  
    return 0;
}

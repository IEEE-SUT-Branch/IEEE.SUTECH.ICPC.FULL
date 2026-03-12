#include "testlib.h"

int main(int argc, char * argv[]) {
    setName("Compares total distributed apples (single integer)");
    registerTestlibCmd(argc, argv);
    long long ja = ans.readLong();
    long long pa = ouf.readLong();
    if (ja != pa) {
        quitf(_wa, "Wrong Answer! Expected %lld apples, but found %lld", ja, pa);
    }
    
    quitf(_ok, "Correct! The total distributed apples is %lld", ja);
}
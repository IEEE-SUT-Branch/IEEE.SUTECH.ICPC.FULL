#include "testlib.h"
#include <iostream>
#include <string>

using namespace std;

int main(int argc, char* argv[]) {
    registerGen(argc, argv, 1);

    int len = rnd.next(1, 100);
    string chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    string s = "";

    for (int i = 0; i < len; i++) {
        s += chars[rnd.next(0, (int)chars.length() - 1)];
    }
    
    cout << s << "\n";
    return 0;
}
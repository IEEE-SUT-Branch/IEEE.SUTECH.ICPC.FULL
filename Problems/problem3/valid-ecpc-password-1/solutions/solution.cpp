#include <iostream>
#include <string>
#include <cctype>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    string p;
    if (!(cin >> p)) return 0;

    if (p.length() < 8) {
        cout << "NO\n";
        return 0;
    }

    bool has_upper = false;
    bool has_lower = false;
    bool has_digit = false;
    bool has_adj = false;

    for (size_t i = 0; i < p.length(); i++) {
        if (isupper(p[i])) has_upper = true;
        if (islower(p[i])) has_lower = true;
        if (isdigit(p[i])) has_digit = true;
        
        if (i > 0 && p[i] == p[i-1]) {
            has_adj = true;
        }
    }

    if (has_upper && has_lower && has_digit && !has_adj) {
        cout << "YES\n";
    } else {
        cout << "NO\n";
    }

    return 0;
}
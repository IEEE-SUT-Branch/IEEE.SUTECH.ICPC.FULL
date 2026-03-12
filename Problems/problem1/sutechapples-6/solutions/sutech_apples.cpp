#include <iostream>
#include <vector>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n, x;
    if (!(cin >> n >> x)) return 0;

    long long total_apples = 0;
    for (int i = 0; i < n; i++) {
        int a;
        cin >> a;
        if (a <= x) {
            total_apples += a;
        }
    }

    cout << total_apples << "\n";
    return 0;
}

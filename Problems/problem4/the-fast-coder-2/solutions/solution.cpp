#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    long long m;
    if (!(cin >> n >> m)) return 0;

    vector<int> t(n);
    for (int i = 0; i < n; i++) {
        cin >> t[i];
    }

    int max_len = 0;
    int l = 0;
    long long current_sum = 0;

    for (int r = 0; r < n; r++) {
        current_sum += t[r];
        
        while (current_sum > m && l <= r) {
            current_sum -= t[l];
            l++;
        }
        
        max_len = max(max_len, r - l + 1);
    }

    cout << max_len << "\n";
    return 0;
}
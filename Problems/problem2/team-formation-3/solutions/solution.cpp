#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
  
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    if (!(cin >> n)) return 0;

    vector<int> s(n);
    for (int i = 0; i < n; i++) {
        cin >> s[i];
    }

    sort(s.rbegin(), s.rend());

    long long max_sum = 0;
    max_sum += s[0];
    max_sum += s[1];
    max_sum += s[2];

    cout << max_sum << "\n";
    return 0;
}

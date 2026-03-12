#include <iostream>
#include <vector>
#include <queue>
#include <string>

using namespace std;

int dr[] = {-1, 1, 0, 0};
int dc[] = {0, 0, -1, 1};

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int r, c;
    if (!(cin >> r >> c)) return 0;

    vector<string> grid(r);
    for (int i = 0; i < r; i++) {
        cin >> grid[i];
    }

    vector<vector<int>> dist(r, vector<int>(c, -1));
    queue<pair<int, int>> q;

    q.push({0, 0});
    dist[0][0] = 0;

    while (!q.empty()) {
        pair<int, int> curr = q.front();
        q.pop();

        int curr_r = curr.first;
        int curr_c = curr.second;

        if (curr_r == r - 1 && curr_c == c - 1) {
            cout << dist[curr_r][curr_c] << "\n";
            return 0;
        }

        for (int i = 0; i < 4; i++) {
            int nr = curr_r + dr[i];
            int nc = curr_c + dc[i];

            if (nr >= 0 && nr < r && nc >= 0 && nc < c && grid[nr][nc] == '.' && dist[nr][nc] == -1) {
                dist[nr][nc] = dist[curr_r][curr_c] + 1;
                q.push({nr, nc});
            }
        }
    }

    cout << "-1\n";
    return 0;
}
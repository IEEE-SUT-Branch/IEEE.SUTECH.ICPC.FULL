async function tryCompiler(compiler) {
  const res = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: "#include <iostream>\nusing namespace std; int main(){ long long a,b; if(!(cin>>a>>b)) return 0; cout << (a+b) << '\\n'; return 0; }",
      compiler,
      stdin: "1 2\n",
      options: "",
      "compiler-option-raw": "-std=c++17",
      "runtime-option-raw": "",
      save: false,
    }),
  });

  const text = await res.text();
  console.log(`compiler=${compiler} status=${res.status}`);
  console.log(text.slice(0, 350));
}

async function main() {
  await tryCompiler("gcc-head");
  await tryCompiler("gcc-12.1.0");
  await tryCompiler("clang-head");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
